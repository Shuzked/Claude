# Rellena huecos cortos del seguimiento interpolando la transformación entre los fotogramas vecinos.
import numpy as np
S='/tmp/claude-0/-home-user-Claude/0931d5f0-2014-5d67-a994-6b77a811b555/scratchpad/y9/'
d=dict(np.load(S+'lavM.npz'))
SEGS=[(1.6,8.8),(13.3,22.4),(22.5,30.2),(29.8,37.3),(37.0,45.0),(45.2,53.9),(53.8,67.7),(67.7,78.0)]
filled=0
for a,b in SEGS:
    n0,n1=int(a*25),min(int(b*25),1949)
    n=n0
    while n<=n1:
        if str(n) in d: n+=1; continue
        g0=n
        while n<=n1 and str(n) not in d: n+=1
        g1=n-1; L,R=d.get(str(g0-1)),d.get(str(n))
        if L is not None and R is not None and L[6]==R[6] and g1-g0<20:
            for k in range(g0,g1+1):
                w=(k-g0+1)/(g1-g0+2); d[str(k)]=L*(1-w)+R*w; filled+=1
        elif (L is not None) != (R is not None) and g1-g0<6:
            for k in range(g0,g1+1): d[str(k)]=L if L is not None else R; filled+=1
np.savez(S+'lavM.npz',**d)
print('rellenados',filled)
