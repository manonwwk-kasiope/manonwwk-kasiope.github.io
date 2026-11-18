"""Compile seulement la cible XCTest locale pour attendre deux tailles en un passage."""
from pathlib import Path
import shutil,tempfile,subprocess
root=Path(__file__).resolve().parent
tmp=Path(tempfile.mkdtemp(prefix='snake-quant-test-'));shutil.copy2(root.parent/'qa-ios/project.yml',tmp/'project.yml')
(tmp/'Tests').mkdir()
source=(root.parent/'charge-ios/SafariPaysage.swift').read_text()
assert '.seconds(164)' in source
(tmp/'Tests/SafariFlow.swift').write_text(source.replace('executionTimeAllowance = 300','executionTimeAllowance = 420').replace('.seconds(164)','.seconds(275)'))
with (tmp/'build.log').open('w') as log:
    subprocess.run(['xcodegen','generate','--spec',str(tmp/'project.yml')],cwd=tmp,stdout=log,stderr=subprocess.STDOUT,check=True)
    subprocess.run(['xcodebuild','build-for-testing','-project',str(tmp/'MobileSafariArcadeTests.xcodeproj'),'-scheme','MobileSafariArcadeTests','-destination','generic/platform=iOS Simulator','-derivedDataPath',str(tmp/'build'),'CODE_SIGNING_ALLOWED=NO'],stdout=log,stderr=subprocess.STDOUT,check=True)
print(next((tmp/'build/Build/Products').glob('MobileSafariArcadeTests_*.xctestrun')))
