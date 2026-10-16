# Micrófono de solapa: puntos SIFT del micro y del cuello alrededor, ajuste de semejanza (RANSAC)
# por fotograma y sustitución por el parche limpio (IA) con la misma transformación.
import cv2, numpy as np
S='/tmp/claude-0/-home-user-Claude/0931d5f0-2014-5d67-a994-6b77a811b555/scratchpad/'
W,H=1080,1920
sift=cv2.SIFT_create(nfeatures=800,contrastThreshold=0.02)
def mkref(frame, ox, oy, clean, maskfull):
    im=cv2.imread(S+'y9/lav/'+frame); P=im[oy:oy+256,ox:ox+256]
    C=cv2.resize(cv2.imread(S+'y9/lav/'+clean),(256,256),interpolation=cv2.INTER_AREA).astype(np.float32)
    LM=cv2.resize(maskfull,(256,256),interpolation=cv2.INTER_AREA)
    PM=cv2.GaussianBlur(cv2.dilate((LM>60).astype(np.uint8)*255,np.ones((13,13),np.uint8)).astype(np.float32)/255,(0,0),2.5)
    KR=cv2.dilate((LM>60).astype(np.uint8),np.ones((61,61),np.uint8))
    kp,ds=sift.detectAndCompute(cv2.cvtColor(P,cv2.COLOR_BGR2GRAY),KR)
    return dict(C=C,PM=PM,KR=KR,KP=kp,DS=ds)
hmA=np.zeros((512,512),np.uint8); hmA[156:356,136:376]=cv2.imread(S+'y9/lav/hi_mask.png',0)
REFS=[mkref('f_10.png',499,780,'neck_clean.png',hmA), mkref('fB.png',640,792,'neckB_clean.png',cv2.imread(S+'y9/lav/hiB_mask.png',0))]
OX,OY=499,780
CLEAN=REFS[0]['C']; PM=REFS[0]['PM']; KR=REFS[0]['KR']; KP=REFS[0]['KP']; DS=REFS[0]['DS']
bf=cv2.BFMatcher(cv2.NORM_L2)
class Lav:
    def __init__(self): self.c=np.array([OX+128.,OY+128.]); self.M=None; self.pg=None; self.pts=None; self.src=''; self.rid=0
    def sift(self, gray):
        R=200
        x0,y0=int(max(0,self.c[0]-R)),int(max(0,self.c[1]-R)); x1,y1=int(min(W,self.c[0]+R)),int(min(H,self.c[1]+R))
        kp,ds=sift.detectAndCompute(gray[y0:y1,x0:x1],None)
        if ds is None or len(kp)<5: return None
        best=None
        for rid,rf in enumerate(REFS):
            mt=[m for m,n in (p for p in bf.knnMatch(rf['DS'],ds,k=2) if len(p)==2) if m.distance<0.85*n.distance]
            if len(mt)<5: continue
            A=np.float32([rf['KP'][m.queryIdx].pt for m in mt]); B=np.float32([kp[m.trainIdx].pt for m in mt])+[x0,y0]
            M,inl=cv2.estimateAffinePartial2D(A,B,method=cv2.RANSAC,ransacReprojThreshold=4.0,maxIters=5000)
            if M is None or inl.sum()<5: continue
            s_=np.hypot(M[0,0],M[1,0])
            if not (0.75<s_<1.6): continue
            if self.M is not None and rid==self.rid and np.linalg.norm(M@[128,128,1]-self.c)>60 and inl.sum()<10: continue
            if best is None or inl.sum()>best[1]: best=(M,int(inl.sum()),rid)
        return best
    def flow(self, gray):
        if self.pg is None or self.M is None: return None
        p0=self.pts
        p1,st,_=cv2.calcOpticalFlowPyrLK(self.pg,gray,p0,None,winSize=(21,21),maxLevel=3)
        pb,st2,_=cv2.calcOpticalFlowPyrLK(gray,self.pg,p1,None,winSize=(21,21),maxLevel=3)
        ok=(st.ravel()==1)&(st2.ravel()==1)&(np.linalg.norm(pb-p0,axis=2).ravel()<1.0)
        if ok.sum()<6: return None
        D,inl=cv2.estimateAffinePartial2D(p0[ok],p1[ok],method=cv2.RANSAC,ransacReprojThreshold=2.0)
        if D is None: return None
        if abs(np.hypot(D[0,0],D[1,0])-1)>0.08 or np.hypot(D[0,2],D[1,2])>40: return None
        M=np.vstack([D,[0,0,1]])@np.vstack([self.M,[0,0,1]])
        return M[:2],int(inl.sum()),self.rid
    def __call__(self, im):
        gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
        r=self.sift(gray); src='sift'
        if r is None: r=self.flow(gray); src='flow'
        if r is None:
            self.pg=None; self.M=None; return im,None
        M,ni=r; self.M=M; self.c=M@np.array([128,128,1.0]); self.src=src
        # puntos para el flujo del siguiente fotograma: esquinas en la zona del micro proyectada
        zone=cv2.warpAffine(KR*255,M,(W,H))
        self.pts=cv2.goodFeaturesToTrack(gray,120,0.01,4,mask=zone)
        if self.pts is None or len(self.pts)<6: self.pg=None
        else: self.pts=self.pts.astype(np.float32); self.pg=gray
        s=np.hypot(M[0,0],M[1,0])
        warp=lambda a: cv2.warpAffine(a,M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)
        bm=warp(PM); patch=warp(CLEAN); valid=warp(np.ones((256,256),np.float32))
        ring=(warp(cv2.dilate((PM>0.02).astype(np.float32),np.ones((15,15),np.uint8)))>0.5)&(bm<0.02)&(valid>0.99)
        gain=(im[ring].astype(np.float32).mean(0)+1)/(patch[ring].mean(0)+1) if ring.sum()>30 else np.ones(3)
        p=np.clip(patch*gain,0,255); bm=bm[...,None]
        out=im.astype(np.float32)*(1-bm)+p*bm
        return np.clip(out,0,255).astype(np.uint8),(self.c,ni,s)

def track_segment(grays):
    """Seguimiento hacia delante y hacia atrás; devuelve (M, ref) o None por fotograma."""
    def run(seq):
        lv=Lav(); out=[]
        for g in seq:
            r=lv.sift(g); src='sift'
            if r is None: r=lv.flow(g); src='flow'
            if r is None: lv.pg=None; lv.M=None; out.append(None); continue
            M,ni,rid=r; lv.M=M; lv.rid=rid; lv.c=M@np.array([128,128,1.0])
            zone=cv2.warpAffine(REFS[rid]['KR']*255,M,(W,H))
            pts=cv2.goodFeaturesToTrack(g,120,0.01,4,mask=zone)
            if pts is None or len(pts)<6: lv.pg=None
            else: lv.pts=pts.astype(np.float32); lv.pg=g
            out.append((M,src,rid))
        return out
    f=run(grays); b=run(grays[::-1])[::-1]
    res=[]
    for x,y in zip(f,b):
        if x and x[1]=='sift': res.append((x[0],x[2]))
        elif y and y[1]=='sift': res.append((y[0],y[2]))
        elif x and y and x[2]==y[2]: res.append(((x[0]+y[0])/2,x[2]))
        elif x: res.append((x[0],x[2]))
        elif y: res.append((y[0],y[2]))
        else: res.append(None)
    return res

def apply(im, M, rid=0):
    if M is None: return im
    rf=REFS[rid]
    warp=lambda a: cv2.warpAffine(a,M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)
    bm=warp(rf['PM']); patch=warp(rf['C']); valid=warp(np.ones((256,256),np.float32))
    ring=(warp(cv2.dilate((rf['PM']>0.02).astype(np.float32),np.ones((15,15),np.uint8)))>0.5)&(bm<0.02)&(valid>0.99)
    gain=(im[ring].astype(np.float32).mean(0)+1)/(patch[ring].mean(0)+1) if ring.sum()>30 else np.ones(3)
    p=np.clip(patch*gain,0,255); bm=bm[...,None]
    return np.clip(im.astype(np.float32)*(1-bm)+p*bm,0,255).astype(np.uint8)
