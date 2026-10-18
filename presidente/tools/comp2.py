# Composición final: sala vacía (IA) + Yago con la rotoscopia BiRefNet fotograma a fotograma + micrófonos (IA).
import os, sys, subprocess, cv2, numpy as np
sys.path.insert(0,'/tmp/claude-0/-home-user-Claude/0931d5f0-2014-5d67-a994-6b77a811b555/scratchpad/y9')
from lav3 import apply as lav_apply
from tripod import apply as tr_apply
TRM=np.load('/tmp/claude-0/-home-user-Claude/0931d5f0-2014-5d67-a994-6b77a811b555/scratchpad/y9/trM.npz')
LAVM=np.load('/tmp/claude-0/-home-user-Claude/0931d5f0-2014-5d67-a994-6b77a811b555/scratchpad/y9/lavM.npz')
S='/tmp/claude-0/-home-user-Claude/0931d5f0-2014-5d67-a994-6b77a811b555/scratchpad/'; G=S+'y9/gen/'; A=S+'y9/alpha/'
SRC='/home/user/Claude/presidente/src-media/yago.9.mov'
W,H=1080,1920
out=sys.argv[1]; only=[int(x) for x in sys.argv[2:]]  # fotogramas sueltos para revisar
bg=cv2.GaussianBlur(cv2.resize(cv2.imread(G+'v2_bg.png'),(W,H),interpolation=cv2.INTER_CUBIC).astype(np.float32),(0,0),1.2)
mic=cv2.resize(cv2.imread(G+'v2_mics_rgba.png',cv2.IMREAD_UNCHANGED),(W,H),interpolation=cv2.INTER_AREA).astype(np.float32)
K=float(os.environ.get('MICK','1.0')); cx,cy=W*0.5,H*0.80
mic=cv2.warpAffine(mic,np.float32([[K,0,cx*(1-K)],[0,K,cy*(1-K)]]),(W,H),flags=cv2.INTER_LINEAR)
ma=mic[...,3:]/255; mc=mic[...,:3]
DESK=int(H*0.735)
def frame(n,im):
    p=A+f'a_{n:04d}.png'
    if not os.path.exists(p):
        # fuera del montaje: el fotograma más cercano rotoscopiado
        return None
    a=cv2.imread(p,0).astype(np.float32)/255
    if str(n) in TRM.files:
        v=TRM[str(n)]; im=tr_apply(im,v[:6].reshape(2,3),int(v[6]))
    if str(n) in LAVM.files:
        v=LAVM[str(n)]; im=lav_apply(im,v[:6].reshape(2,3),int(v[6]))
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    blue=((hsv[...,0]>=88)&(hsv[...,0]<=118)&(hsv[...,1]>60)&(hsv[...,2]>125)).astype(np.uint8); blue[:int(H*0.62)]=0
    blue=cv2.dilate(blue,np.ones((7,7),np.uint8))
    bb=cv2.GaussianBlur(blue.astype(np.float32),(0,0),1.5)[...,None]
    dark=np.full_like(im,(28,24,22)).astype(np.float32)+cv2.cvtColor(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR).astype(np.float32)*0.12
    imf=im.astype(np.float32)*(1-bb)+dark*bb
    a[DESK+40:]=0
    a2=cv2.GaussianBlur(a,(0,0),0.6)
    a=a2[...,None]
    if GRADE:
        # Yago a la luz de la sala: negros levantados hacia el azul marino de la sala y un toque más frío en sombras
        lum=imf.mean(2,keepdims=True)/255
        sh=(1-lum)**2
        imf=imf*0.94+np.array([14,8,4])*sh+4
        imf=imf*np.array([1.0,0.985,0.96])  # quita algo de cálido para casar con la pantalla azul
    # fondo negro original: el borde semitransparente ya va premultiplicado por negro
    b=bg
    if GRADE:
        # sombra de contacto de los brazos sobre la mesa
        sm=np.zeros_like(a2); sm[DESK-60:DESK+40]=a2[DESK-60:DESK+40]
        sm=cv2.GaussianBlur(np.roll(sm,14,axis=0),(0,0),14); sm[:DESK-10]=0
        b=bg*(1-0.45*np.clip(sm*1.6,0,1))[...,None]
    f=imf*np.clip(a*1.6,0,1)+b*(1-a)
    if GRADE:
        # envoltura de luz: el azul de la pantalla se cuela por los bordes de Yago
        inner=cv2.GaussianBlur(cv2.erode(a2,np.ones((9,9),np.uint8)),(0,0),5)
        edge=np.clip(a2-inner,0,1)[...,None]
        f=f+BGW*edge*0.55
    f=mc*ma+f*(1-ma)
    if GRADE: f=grade(f)
    return np.clip(f,0,255).astype(np.uint8)

GRADE=os.environ.get('GRADE','1')=='1'
BGW=cv2.GaussianBlur(bg,(0,0),22)
yy,xx=np.mgrid[0:H,0:W]; VIG=(1-0.32*np.clip(((xx-W/2)/(W*0.62))**2+((yy-H*0.45)/(H*0.6))**2,0,1)**1.4)[...,None].astype(np.float32)
def grade(f):
    x=f/255
    # curva de contraste suave (S) y viraje: sombras verde-azuladas, luces cálidas
    x=np.clip(x,0,1); x=x+0.04*np.sin(2*np.pi*(x-0.5))
    l=x.mean(2,keepdims=True)
    x=x+(np.array([0.025,0.01,-0.012])*(1-l)**2)+(np.array([-0.012,0.0,0.02])*l**2)
    g=x.mean(2,keepdims=True); x=g+(x-g)*1.06
    x=x*VIG
    return x*255
dec=subprocess.Popen(['ffmpeg','-v','error','-i',SRC,'-vf',f'scale={W}:{H}','-f','rawvideo','-pix_fmt','bgr24','-'],stdout=subprocess.PIPE)
enc=None if only else subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r','25','-i','-','-c:v','libx264','-crf','12','-preset','slow','-pix_fmt','yuv420p',out],stdin=subprocess.PIPE)
n=0; last=None
while True:
    buf=dec.stdout.read(W*H*3)
    if len(buf)<W*H*3: break
    if only and n>max(only): break
    if not only or n in only:
        im=np.frombuffer(buf,np.uint8).reshape(H,W,3)
        fr=frame(n,im)
        if fr is None: fr=last if last is not None else np.zeros((H,W,3),np.uint8)
        last=fr
        if only: cv2.imwrite(out.replace('.mp4',f'_{n}.jpg'),fr)
        else: enc.stdin.write(fr.tobytes())
    n+=1
dec.kill()
if enc: enc.stdin.close(); enc.wait()
print('frames',n)
