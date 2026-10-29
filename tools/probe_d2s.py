import sys, csv
E=sys.argv[1]+"/mod-4.2.1/patch_d2/data/global/excel/"
def tab(n):
    with open(E+n, encoding='latin-1') as f: return list(csv.DictReader(f, delimiter='\t'))
isc={}
for r in tab("ItemStatCost.txt"):
    if r['ID'].strip(): isc[int(r['ID'])]=r
def iv(x): 
    try: return int(x)
    except: return 0
armor={r['code'] for r in tab("Armor.txt")}
weap={r['code']:r for r in tab("weapons.txt")}
misc={r['code']:r for r in tab("Misc.txt")}
stack={c for c,r in list(weap.items())+list(misc.items()) if r.get('stackable')=='1'}
data=open(sys.argv[1]+"/saves/PracticeSorc.d2s",'rb').read()
class B:
    def __init__(s,d,pos): s.d=d; s.p=pos*8
    def r(s,n):
        v=0
        for i in range(n):
            v|=((s.d[s.p>>3]>>(s.p&7))&1)<<i; s.p+=1
        return v
    def align(s): s.p=(s.p+7)&~7
def stats(b):
    out=[]
    while True:
        sid=b.r(9)
        if sid==0x1ff: return out
        group={17:2,48:2,50:2,52:2,54:3,57:3}.get(sid,1)
        vals=[]
        for k in range(group):
            s=isc[sid+k]; pb=iv(s['Save Param Bits']); 
            par=b.r(pb) if pb else None
            vals.append((b.r(iv(s['Save Bits']))-iv(s['Save Add']),par))
        out.append((sid,isc[sid]['Stat'],vals))
def item(b):
    assert b.r(16)==0x4d4a, "no JM at %x"%((b.p>>3)-2)
    fl=b.r(32); ver=b.r(10); loc=b.r(3); eq=b.r(4); x=b.r(4); y=b.r(4); panel=b.r(3)
    simple=(fl>>21)&1; sock=(fl>>11)&1; rw=(fl>>26)&1; pers=(fl>>24)&1; ear=(fl>>16)&1
    code=bytes(b.r(8) for _ in range(4)).decode('latin-1').strip()
    nsock=b.r(1 if simple else 3)
    info=dict(code=code,ver=ver,loc=loc,eq=eq,x=x,y=y,panel=panel)
    if not simple:
        info['id']=b.r(32); info['ilvl']=b.r(7); q=info['q']=b.r(4)
        if b.r(1): b.r(3)
        if b.r(1): b.r(11)
        if q in(1,3): b.r(3)
        elif q==4: b.r(11); b.r(11)
        elif q in(5,7): info['qid']=b.r(12)
        elif q in(6,8):
            b.r(8);b.r(8)
            for _ in range(6):
                if b.r(1): b.r(11)
        if rw: info['rw']=b.r(16)
        if pers:
            n=''
            while (c:=b.r(7)): n+=chr(c)
        if code in('tbk','ibk'): b.r(5)
        b.r(1)
        if code in armor: info['def']=b.r(iv(isc[31]['Save Bits']))-iv(isc[31]['Save Add'])
        if code in armor or code in weap:
            md=b.r(iv(isc[73]['Save Bits']))
            if md: b.r(iv(isc[72]['Save Bits']))
        if code in stack: info['qty']=b.r(9)
        if sock: b.r(4)
        setmask=b.r(5) if q==5 else 0
        info['stats']=stats(b)
        for i in range(5):
            if setmask>>i&1: stats(b)
        if rw: info['rwstats']=stats(b)
    b.align()
    return info, nsock
def itemlist(off, label):
    assert data[off:off+2]==b'JM'
    n=int.from_bytes(data[off+2:off+4],'little'); b=B(data,off+4)
    print(f"== {label} @{off:#x}: {n} items")
    for _ in range(n):
        it,ns=item(b); print("  ",{k:v for k,v in it.items() if k!='stats'}, [s[1] for s in it.get('stats',[])])
        for _ in range(ns): c,_=item(b); print("     socket:",c['code'])
    return b.p>>3
end=itemlist(data.find(b'JM'), "player")
print("next bytes:", data[end:end+8])
jf=data.find(b'jf',end); end=itemlist(jf+2,"merc"); print("next:", data[end:end+8], "filesize", len(data))
