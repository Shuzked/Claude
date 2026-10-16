# Calcula y guarda la transformación del parche del micro para cada fotograma del montaje (lavM.npz).
import sys, subprocess, cv2, numpy as np
sys.path.insert(0,'/tmp/claude-0/-home-user-Claude/0931d5f0-2014-5d67-a994-6b77a811b555/scratchpad/y9')
from lav3 import track_segment
S='/tmp/claude-0/-home-user-Claude/0931d5f0-2014-5d67-a994-6b77a811b555/scratchpad/y9/'
SEGS=[(1.6,8.8),(13.3,22.4),(22.5,30.2),(29.8,37.3),(37.0,45.0),(45.2,53.9),(53.8,67.7),(67.7,78.0)]
Ms={}
for a,b in SEGS:
    n0,n1=int(a*25),min(int(b*25),1949)
    raw=subprocess.run(['ffmpeg','-v','error','-ss',f'{n0/25:.3f}','-i','/home/user/Claude/presidente/src-media/yago.9.mov','-frames:v',str(n1-n0+1),'-vf','scale=1080:1920,format=gray','-f','rawvideo','-pix_fmt','gray','-'],capture_output=True).stdout
    k=len(raw)//(1080*1920); grays=[np.frombuffer(raw[i*1080*1920:(i+1)*1080*1920],np.uint8).reshape(1920,1080) for i in range(k)]
    for i,r in enumerate(track_segment(grays)):
        if r is not None: Ms[str(n0+i)]=np.hstack([r[0].ravel(),[r[1]]])
    print(a,b,'ok',sum(1 for i in range(k) if str(n0+i) in Ms),'/',k,flush=True)
np.savez(S+'lavM.npz',**Ms)
