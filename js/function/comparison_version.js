const comparison_version = function compareVersions(version1, version2) {
    var parseVersion = (version) => version.split('.').map(Number);

    var [major1, minor1, patch1] = parseVersion(version1);
    var [major2, minor2, patch2] = parseVersion(version2);

    if (major1 !== major2) return major1 - major2;
    if (minor1 !== minor2) return minor1 - minor2;
    return patch1 - patch2;
}
