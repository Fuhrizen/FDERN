import json, pathlib, zipfile, hashlib
root=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((root/'system.json').read_text())
for pack in manifest['packs']:
    if not (root/pack['path']).is_dir(): raise SystemExit('Build compendiums first: npm run build:packs')
files=[root/name for name in ['system.json','README.md','LICENSE','CHANGELOG.md']]
for directory in ['scripts','templates','styles','lang','assets','packs','docs']:
    files.extend(p for p in (root/directory).rglob('*') if p.is_file() and p.name!='LOCK')
out=root/'dist';out.mkdir(exist_ok=True)
with zipfile.ZipFile(out/'fdern.zip','w',compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        info=zipfile.ZipInfo('fdern/'+path.relative_to(root).as_posix(), date_time=(2026,10,12,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        archive.writestr(info,path.read_bytes())
(out/'system.json').write_text(json.dumps(manifest,indent=2)+'\n')
(out/'SHA256SUMS').write_text(''.join(f'{hashlib.sha256((out/name).read_bytes()).hexdigest()}  {name}\n' for name in ['fdern.zip','system.json']))
with zipfile.ZipFile(out/'fdern.zip') as archive:
    assert archive.testzip() is None
    for pack in manifest['packs']: assert any(n.startswith('fdern/'+pack['path']+'/') for n in archive.namelist())
print(f'Built v{manifest["version"]}: {len(files)} files, {(out/"fdern.zip").stat().st_size} bytes')
