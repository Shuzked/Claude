# Procesa una voz como si saliera del micro de mano de un periodista por la megafonía de una sala de prensa.
import sys, numpy as np, subprocess
from scipy import signal
SR = 48000
rng = np.random.default_rng(7)

def load(p):
    raw = subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    # recortar silencios
    e = np.convolve(np.abs(x), np.ones(480)/480, 'same'); idx = np.where(e > 10**(-48/20))[0]
    return x[max(0,idx[0]-1200):idx[-1]+2400] if len(idx) else x

def peq(x, f, g, q):
    A=10**(g/40); w=2*np.pi*f/SR; al=np.sin(w)/(2*q)
    b=[1+al*A,-2*np.cos(w),1-al*A]; a=[1+al/A,-2*np.cos(w),1-al/A]
    return signal.lfilter(b,a,x)

def comp(x, thr=-22, ratio=3.5, att=0.004, rel=0.12):
    env=np.zeros_like(x); a1=np.exp(-1/(att*SR)); r1=np.exp(-1/(rel*SR)); e=0
    ax=np.abs(x)
    for i in range(len(x)):
        e = a1*e+(1-a1)*ax[i] if ax[i]>e else r1*e+(1-r1)*ax[i]; env[i]=e
    db=20*np.log10(env+1e-9); gr=np.minimum(0,(thr-db)*(1-1/ratio))
    return x*10**(gr/20)

def room_ir(rt60=0.75, pre=0.018):
    n=int(SR*(rt60*1.2)); t=np.arange(n)/SR
    ir=rng.standard_normal(n)*np.exp(-6.9*t/rt60)
    ir=signal.sosfilt(signal.butter(2,[250,5000],'band',fs=SR,output='sos'),ir)
    for d,g in [(0.011,0.5),(0.019,0.35),(0.027,0.3),(0.041,0.22)]:  # primeras reflexiones
        ir[int(d*SR)]+=g*np.max(np.abs(ir))*4
    ir=np.concatenate([np.zeros(int(pre*SR)),ir]); return ir/np.sqrt(np.sum(ir**2))

IR = room_ir()

def process(x):
    # micro de mano dinámico: efecto proximidad + presencia
    x=signal.sosfilt(signal.butter(2,110,'high',fs=SR,output='sos'),x)
    x=peq(x,220,2.5,0.9); x=peq(x,3200,4,1.0); x=peq(x,450,-2,1.2)
    x=signal.sosfilt(signal.butter(4,8500,'low',fs=SR,output='sos'),x)
    x=comp(x/ (np.max(np.abs(x))+1e-9) *0.8)
    # megafonía: banda limitada y algo de saturación
    pa=signal.sosfilt(signal.butter(3,[190,6800],'band',fs=SR,output='sos'),x)
    pa=peq(pa,1600,2.5,1.0)
    pa=np.tanh(pa*2.2)/np.tanh(2.2)
    # sala: reverberación + rebote de la megafonía
    wet=signal.fftconvolve(pa,IR)[:len(pa)+len(IR)]
    wet=np.pad(wet,(0,len(pa)+len(IR)-len(wet)))
    dry=np.concatenate([pa,np.zeros(len(IR))])
    slap=np.zeros_like(dry); d=int(0.038*SR); slap[d:]=dry[:-d]*0.18
    y=dry*0.78+wet*0.30+slap
    # golpecito al acercar el micro + ambiente de sala muy bajo
    pre=int(0.35*SR); y=np.concatenate([np.zeros(pre),y])
    t=np.arange(int(0.05*SR))/SR; thump=np.sin(2*np.pi*70*t)*np.exp(-t*60)*0.05
    y[int(0.12*SR):int(0.12*SR)+len(thump)]+=thump
    bed=signal.sosfilt(signal.butter(2,[120,1800],'band',fs=SR,output='sos'),rng.standard_normal(len(y)))
    bed=bed/np.std(bed)*10**(-46/20)
    y=y+bed
    y=y/np.max(np.abs(y))*10**(-3/20)
    fi=int(0.02*SR); y[:fi]*=np.linspace(0,1,fi); y[-int(0.3*SR):]*=np.linspace(1,0,int(0.3*SR))
    return y

def save(p,y):
    subprocess.run(['ffmpeg','-v','error','-y','-f','f64le','-ar',str(SR),'-ac','1','-i','-',p],input=y.astype(np.float64).tobytes())

if __name__=='__main__':
    for a in sys.argv[1:]:
        src,dst=a.split(':'); save(dst,process(load(src)))
