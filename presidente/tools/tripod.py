# Trípode azul delante del pecho: máscara fija (el trípode no se mueve) y pecho limpio (IA)
# que sigue el movimiento del torso (SIFT sobre el logo, hacia delante y hacia atrás).
import cv2, numpy as np
S='/tmp/claude-0/-home-user-Claude/0931d5f0-2014-5d67-a994-6b77a811b555/scratchpad/'
L=S+'y9/lav/'
W,H=1080,1920
X0,Y0=360,850  # recorte 4K (720,1700) 720x1280 -> 1080 (360,850) 360x640
SRCS=[('f_10.png','chestW_clean.png'),('fC.png','chestWB_clean.png')]
tm=cv2.imread(L+'tripod_mask360.png',0).astype(np.float32)/255
tm[356:]=0  # sólo bola y poste sobre el pecho; abajo las manos se mueven
TMASK=np.zeros((H,W),np.float32); TMASK[Y0:Y0+640,X0:X0+360]=tm
TMASK=cv2.GaussianBlur(TMASK,(0,0),2.5); TMASK=np.clip(TMASK*1.3,0,1)
sift=cv2.SIFT_create(nfeatures=1500,contrastThreshold=0.015)
REFS=[]
for f,cc in SRCS:
    rim=cv2.imread(L+f); cl=cv2.resize(cv2.imread(L+cc),(360,640),interpolation=cv2.INTER_AREA)
    CAN=rim.astype(np.float32).copy(); CAN[Y0:Y0+640,X0:X0+360]=cl.astype(np.float32)
    KZ=np.zeros((H,W),np.uint8); KZ[860:1200,300:800]=1; KZ[cv2.dilate((TMASK>0.02).astype(np.uint8),np.ones((15,15),np.uint8))>0]=0
    kp,ds=sift.detectAndCompute(cv2.cvtColor(rim,cv2.COLOR_BGR2GRAY),KZ)
    REFS.append(dict(CAN=CAN,KZ=KZ,KP=kp,DS=ds))
KZ=REFS[0]['KZ']
bf=cv2.BFMatcher(cv2.NORM_L2)
def sift_M(g, c):
    R=260; x0,y0=int(max(0,c[0]-R)),int(max(0,c[1]-R)); x1,y1=int(min(W,c[0]+R)),int(min(H,c[1]+R))
    zone=np.ones(g[y0:y1,x0:x1].shape,np.uint8); zone[(TMASK[y0:y1,x0:x1]>0.05)]=0
    kp,ds=sift.detectAndCompute(g[y0:y1,x0:x1],zone)
    if ds is None or len(kp)<8: return None
    cand=[]
    for rid,rf in enumerate(REFS):
        mt=[m for m,n in (p for p in bf.knnMatch(rf['DS'],ds,k=2) if len(p)==2) if m.distance<0.8*n.distance]
        if len(mt)<8: continue
        A=np.float32([rf['KP'][m.queryIdx].pt for m in mt]); B=np.float32([kp[m.trainIdx].pt for m in mt])+[x0,y0]
        M,inl=cv2.estimateAffinePartial2D(A,B,method=cv2.RANSAC,ransacReprojThreshold=3.0,maxIters=5000)
        if M is None or inl.sum()<8 or not (0.8<np.hypot(M[0,0],M[1,0])<1.4): continue
        cand.append((M,int(inl.sum()),rid))
    if not cand: return None
    # la referencia cuya pose está más cerca (el parche limpio cae dentro de su zona reconstruida)
    good=[c for c in cand if c[1]>=12] or cand
    return min(good,key=lambda c: np.linalg.norm(c[0]@[540,1000,1]-np.array([540,1000])))
def track_segment(grays):
    def run(seq):
        out=[]; M=None; rid=0; pg=None; pts=None
        for g in seq:
            c=(M@[540,1060,1]) if M is not None else np.array([540.,1060.])
            r=sift_M(g,c); src='sift'
            if r is not None: M_,_,rid_=r
            else:
                M_=None
                if pg is not None:
                    p1,st,_=cv2.calcOpticalFlowPyrLK(pg,g,pts,None,winSize=(21,21),maxLevel=3)
                    ok=st.ravel()==1; D=None
                    if ok.sum()>=10: D,_=cv2.estimateAffinePartial2D(pts[ok],p1[ok],method=cv2.RANSAC,ransacReprojThreshold=2.0)
                    if D is not None and abs(np.hypot(D[0,0],D[1,0])-1)<0.06: M_=(np.vstack([D,[0,0,1]])@np.vstack([M,[0,0,1]]))[:2]; rid_=rid; src='flow'
            if M_ is None: out.append(None); M=None; pg=None; continue
            M,rid=M_,rid_
            zone=(cv2.warpAffine(REFS[rid]['KZ']*255,M,(W,H))>0).astype(np.uint8)*255
            p=cv2.goodFeaturesToTrack(g,200,0.01,6,mask=zone)
            pg,pts=(g,p.astype(np.float32)) if p is not None and len(p)>=10 else (None,None)
            out.append((M,src,rid))
        return out
    f=run(grays); b=run(grays[::-1])[::-1]; res=[]
    for x,y in zip(f,b):
        if x and x[1]=='sift': res.append((x[0],x[2]))
        elif y and y[1]=='sift': res.append((y[0],y[2]))
        elif x and y and x[2]==y[2]: res.append(((x[0]+y[0])/2,x[2]))
        elif x or y: z=x or y; res.append((z[0],z[2]))
        else: res.append(None)
    return res
def apply(im, M, rid=0):
    if M is None: return im
    patch=cv2.warpAffine(REFS[rid]['CAN'],M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
    ring=(cv2.dilate((TMASK>0.05).astype(np.uint8),np.ones((21,21),np.uint8))>0)&(TMASK<0.02)
    ycc=cv2.cvtColor(im,cv2.COLOR_BGR2YCrCb)
    skin=((ycc[...,1]>138)&(ycc[...,1]<178)&(ycc[...,2]>80)&(ycc[...,2]<128)&(ycc[...,0]>50)).astype(np.float32)
    skin=cv2.GaussianBlur(cv2.dilate(skin,np.ones((5,5),np.uint8)),(0,0),1.5)
    # ajuste de color sólo con la tela (sin el blanco del logo ni piel)
    lum=im.mean(2); fab=ring&(lum<110)&(patch.mean(2)<110)
    gain=(np.median(im[fab].astype(np.float32),0)+1)/(np.median(patch[fab],0)+1) if fab.sum()>50 else np.ones(3)
    gain=np.clip(gain,0.7,1.4)
    m=(TMASK*(1-skin))[...,None]
    return np.clip(im.astype(np.float32)*(1-m)+np.clip(patch*gain,0,255)*m,0,255).astype(np.uint8)
