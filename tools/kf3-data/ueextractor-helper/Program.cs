using System.Reflection;

static string Required(IDictionary<string, string> args, string name)
{
    if (!args.TryGetValue(name, out var value) || string.IsNullOrWhiteSpace(value))
        throw new ArgumentException($"Missing {name}");
    return value;
}

static Dictionary<string, string> ParseArgs(string[] argv)
{
    var args = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    for (var i = 0; i < argv.Length; i++)
    {
        var arg = argv[i];
        if (!arg.StartsWith("--")) continue;
        if (i + 1 >= argv.Length || argv[i + 1].StartsWith("--"))
            throw new ArgumentException($"{arg} requires a value");
        args[arg] = argv[++i];
    }
    return args;
}

static IEnumerable<string> GetAssetPaths(UnrealArchiveReader reader)
{
    var providerField = typeof(UnrealArchiveReader).GetField("_provider", BindingFlags.Instance | BindingFlags.NonPublic)
        ?? throw new InvalidOperationException("Could not find _provider field");
    var provider = providerField.GetValue(reader) ?? throw new InvalidOperationException("Provider is null");
    var filesProperty = provider.GetType().GetProperty("Files")
        ?? throw new InvalidOperationException("Could not find Files property");
    var files = filesProperty.GetValue(provider) ?? throw new InvalidOperationException("Files is null");
    var keysProperty = files.GetType().GetProperty("Keys")
        ?? throw new InvalidOperationException("Could not find Files.Keys property");
    var keys = keysProperty.GetValue(files) as System.Collections.IEnumerable
        ?? throw new InvalidOperationException("Files.Keys is not enumerable");

    foreach (var key in keys)
        if (key is string path)
            yield return path;
}

var parsed = ParseArgs(args);
var mode = Required(parsed, "--mode");
var gameRoot = Required(parsed, "--game-root");
var aes = parsed.TryGetValue("--aes-file", out var aesFile) ? File.ReadAllText(aesFile).Trim() : parsed.GetValueOrDefault("--aes", "");
var version = parsed.GetValueOrDefault("--version", "UE5_4");

UnrealArchiveReader.EngineSpecified = true;
using var reader = new UnrealArchiveReader(gameRoot, version, aes);

if (mode.Equals("list", StringComparison.OrdinalIgnoreCase))
{
    var filter = parsed.GetValueOrDefault("--filter", "");
    foreach (var assetPath in GetAssetPaths(reader).Order(StringComparer.OrdinalIgnoreCase))
    {
        if (string.IsNullOrEmpty(filter) || assetPath.Contains(filter, StringComparison.OrdinalIgnoreCase))
            Console.WriteLine(assetPath);
    }
}
else if (mode.Equals("extract", StringComparison.OrdinalIgnoreCase))
{
    var assetPath = Required(parsed, "--asset");
    var outPath = Required(parsed, "--out");
    var bytes = reader.GetFileBytes(assetPath) ?? throw new InvalidOperationException($"Could not read {assetPath}");
    Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(outPath))!);
    File.WriteAllBytes(outPath, bytes);
    Console.WriteLine($"Wrote {bytes.Length} bytes to {outPath}");
}
else if (mode.Equals("extract-filter", StringComparison.OrdinalIgnoreCase))
{
    var filter = Required(parsed, "--filter");
    var outDir = Required(parsed, "--out-dir");
    var count = 0;
    foreach (var assetPath in GetAssetPaths(reader).Order(StringComparer.OrdinalIgnoreCase))
    {
        if (!assetPath.Contains(filter, StringComparison.OrdinalIgnoreCase))
            continue;

        var bytes = reader.GetFileBytes(assetPath);
        if (bytes is null)
        {
            Console.WriteLine($"SKIP {assetPath}");
            continue;
        }

        var outPath = Path.Combine(outDir, assetPath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(outPath))!);
        File.WriteAllBytes(outPath, bytes);
        Console.WriteLine($"WROTE {bytes.Length} {assetPath}");
        count += 1;
    }
    Console.WriteLine($"Extracted {count} file(s).");
}
else
{
    throw new ArgumentException($"Unknown mode: {mode}");
}
