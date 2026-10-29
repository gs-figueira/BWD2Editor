import sys
from mpq_extractor import MPQArchive
src, dst = sys.argv[1], sys.argv[2]
with MPQArchive(src) as m:
    n=0
    for f in m.list_files("*"):
        s=str(f).lower()
        if s.startswith(("data\\global\\excel","data\\local\\lng")) or s.endswith((".txt",".tbl",".bin")):
            m.extract_file_to_dir(f, dst); n+=1
    print(src.split('/')[-1], n)
