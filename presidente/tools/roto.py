# Rotoscopia fotograma a fotograma (BiRefNet portrait) de los tramos del montaje.
import os, subprocess, time, cv2, numpy as np, onnxruntime as ort
from rembg import new_session, remove
from PIL import Image
S='/tmp/claude-0/-home-user-Claude/0931d5f0-2014-5d67-a994-6b77a811b555/scratchpad/y9/'
SRC='/home/user/Claude/presidente/src-media/yago.9.mov'
SEGS=[(1.6,8.8),(13.3,22.4),(22.5,30.2),(29.8,37.3),(37.0,45.0),(45.2,53.9),(53.8,67.7),(67.7,78.0)]
Y0,Y1=250,1560
W,H=1080,1920
so=ort.SessionOptions(); so.enable_cpu_mem_arena=False; so.intra_op_num_threads=4
s=new_session('birefnet-portrait', sess_opts=so)
todo=sorted({n for a,b in SEGS for n in range(int(a*25),int(b*25)+1) if n<1950})
print('total',len(todo),flush=True)
for a,b in SEGS:
    n0,n1=int(a*25),min(int(b*25),1949)
    if all(os.path.exists(S+f'alpha/a_{n:04d}.png') for n in range(n0,n1+1)): continue
    dec=subprocess.Popen(['ffmpeg','-v','error','-ss',f'{n0/25:.3f}','-i',SRC,'-frames:v',str(n1-n0+1),'-vf',f'scale={W}:{H}','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
    n=n0
    while n<=n1:
        buf=dec.stdout.read(W*H*3)
        if len(buf)<W*H*3: break
        o=S+f'alpha/a_{n:04d}.png'
        if not os.path.exists(o):
            im=np.frombuffer(buf,np.uint8).reshape(H,W,3)
            t=time.time()
            m=np.array(remove(Image.fromarray(im[Y0:Y1].copy()),session=s,only_mask=True))
            full=np.zeros((H,W),np.uint8); full[Y0:Y1]=m
            cv2.imwrite(o+'.tmp.png',full); os.replace(o+'.tmp.png',o)
            print(n,round(time.time()-t,1),flush=True)
        n+=1
    dec.kill()
print('DONE',flush=True)
