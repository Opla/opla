import PackageJson from "@npmcli/package-json";
import { writeFile } from 'fs/promises';

const version = process.argv[2];
const [semVer, major, minor, patch, prerelease, buildmetadata] = version.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/) ?? [];
let prereleaseName;
let prereleaseVersion;
if (prerelease?.indexOf('.') > 0) {
    ([prereleaseName, prereleaseVersion = 0] = prerelease?.split('.') || []);
} else {
    prereleaseVersion = prerelease || '0';
}
const msiVersion = `${major}.${minor}.${Number(patch)*1000 + Number(prereleaseVersion)}`;
console.log('semVer', {semVer, major, minor, patch, prerelease, prereleaseName, prereleaseVersion, buildmetadata, msiVersion});

const pkgJson = await PackageJson.load("./webapp");
console.log('previous Version=', pkgJson.content.version);
pkgJson.update({
    version
});
await pkgJson.save();

const tauriWindowsToml =
`# Dirty hack to fix Windows version not fully compatible with semver
[package]
version = "${msiVersion}"
# fix missing dll files for Windows version
[tauri.bundle.resources]
"binaries/llama.cpp/llama.dll" = "llama.dll"
"binaries/llama.cpp/ggml.dll" = "ggml.dll"
`;
await writeFile('./webapp/native/Tauri.windows.toml', tauriWindowsToml);


