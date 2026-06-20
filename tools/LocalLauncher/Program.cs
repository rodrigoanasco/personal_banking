using System.Diagnostics;

internal static class Program
{
    private const string ProjectRoot =
        @"C:\Users\Rodrigo\Desktop\Rodrigo\personal_projects\banking_tracker";
    private const string ApiUrl = "http://localhost:5288";
    private const string AppUrl = "http://localhost:3000";

    private static readonly string ApiPublishDirectory = Path.Combine(
        ProjectRoot,
        "PersonalBankingApi",
        "bin",
        "Release",
        "net10.0",
        "publish");
    private static readonly string ApiExecutable =
        Path.Combine(ApiPublishDirectory, "PersonalBankingApi.exe");
    private static readonly string FrontendDirectory =
        Path.Combine(ProjectRoot, "PersonalBankingFrontend");
    private static readonly string NextBuildDirectory =
        Path.Combine(FrontendDirectory, ".next");
    private static readonly List<Process> Processes = new();
    private static readonly object StopLock = new();
    private static bool _stopping;

    private static async Task<int> Main(string[] args)
    {
        Console.Title = "Banking Tracker";

        Console.CancelKeyPress += (_, eventArgs) =>
        {
            eventArgs.Cancel = true;
            StopServers();
        };

        AppDomain.CurrentDomain.ProcessExit += (_, _) => StopServers();

        if (!File.Exists(ApiExecutable))
        {
            Console.WriteLine("The published API was not found.");
            Console.WriteLine($"Expected: {ApiExecutable}");
            Console.WriteLine("Run the release publish step before using this launcher.");
            WaitBeforeExit();
            return 1;
        }

        if (!Directory.Exists(NextBuildDirectory))
        {
            Console.WriteLine("The frontend production build was not found.");
            Console.WriteLine($"Expected: {NextBuildDirectory}");
            Console.WriteLine("Run npm run build before using this launcher.");
            WaitBeforeExit();
            return 1;
        }

        try
        {
            Console.WriteLine("Starting Banking Tracker...");
            Console.WriteLine("Keep this window open while you use the app.");
            Console.WriteLine("Press Q or Ctrl+C to stop the servers.");
            Console.WriteLine();

            var apiProcess = StartProcess(
                ApiExecutable,
                "",
                ApiPublishDirectory,
                "api",
                new Dictionary<string, string>
                {
                    ["ASPNETCORE_URLS"] = ApiUrl,
                    ["ASPNETCORE_ENVIRONMENT"] = "Development"
                });
            Processes.Add(apiProcess);

            var frontendProcess = StartProcess(
                "cmd.exe",
                "/c npm.cmd run start -- -p 3000",
                FrontendDirectory,
                "web",
                new Dictionary<string, string>
                {
                    ["NEXT_PUBLIC_API_BASE_URL"] = ApiUrl
                });
            Processes.Add(frontendProcess);

            Console.WriteLine();
            Console.WriteLine("Waiting for servers...");
            await WaitForEndpointAsync($"{ApiUrl}/health", "API");
            await WaitForEndpointAsync(AppUrl, "Web app");

            Console.WriteLine();
            var smokeTest = args.Contains("--smoke-test", StringComparer.OrdinalIgnoreCase);
            var noBrowser = smokeTest
                || args.Contains("--no-browser", StringComparer.OrdinalIgnoreCase);

            if (smokeTest)
            {
                Console.WriteLine("Smoke test passed. Shutting down.");
                StopServers();
                return 0;
            }

            if (!noBrowser)
            {
                Console.WriteLine($"Opening {AppUrl}");
                Process.Start(new ProcessStartInfo(AppUrl) { UseShellExecute = true });
            }

            while (!_stopping)
            {
                if (!Console.IsInputRedirected && Console.KeyAvailable)
                {
                    var key = Console.ReadKey(intercept: true);

                    if (key.Key == ConsoleKey.Q)
                    {
                        StopServers();
                        break;
                    }
                }

                if (Processes.Any(process => process.HasExited))
                {
                    Console.WriteLine();
                    Console.WriteLine("One of the servers stopped. Shutting down the rest.");
                    StopServers();
                    break;
                }

                await Task.Delay(250);
            }

            return 0;
        }
        catch (Exception exception)
        {
            Console.WriteLine();
            Console.WriteLine($"Launcher error: {exception.Message}");
            StopServers();
            WaitBeforeExit();
            return 1;
        }
    }

    private static Process StartProcess(
        string fileName,
        string arguments,
        string workingDirectory,
        string label,
        IReadOnlyDictionary<string, string> environment)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        foreach (var item in environment)
        {
            startInfo.Environment[item.Key] = item.Value;
        }

        var process = new Process
        {
            StartInfo = startInfo,
            EnableRaisingEvents = true
        };

        process.OutputDataReceived += (_, eventArgs) =>
        {
            if (!string.IsNullOrWhiteSpace(eventArgs.Data))
            {
                Console.WriteLine($"[{label}] {eventArgs.Data}");
            }
        };
        process.ErrorDataReceived += (_, eventArgs) =>
        {
            if (!string.IsNullOrWhiteSpace(eventArgs.Data))
            {
                Console.WriteLine($"[{label}] {eventArgs.Data}");
            }
        };

        if (!process.Start())
        {
            throw new InvalidOperationException($"Could not start {label}.");
        }

        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        return process;
    }

    private static async Task WaitForEndpointAsync(string url, string label)
    {
        using var client = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(2)
        };
        var deadline = DateTime.UtcNow.AddSeconds(90);

        while (DateTime.UtcNow < deadline)
        {
            try
            {
                using var response = await client.GetAsync(url);

                if ((int)response.StatusCode < 500)
                {
                    Console.WriteLine($"{label} is ready.");
                    return;
                }
            }
            catch
            {
                // The server may still be booting.
            }

            await Task.Delay(750);
        }

        throw new TimeoutException($"{label} did not become ready at {url}.");
    }

    private static void StopServers()
    {
        lock (StopLock)
        {
            if (_stopping)
            {
                return;
            }

            _stopping = true;
        }

        Console.WriteLine();
        Console.WriteLine("Stopping Banking Tracker...");

        foreach (var process in Processes.Where(process => !process.HasExited).Reverse())
        {
            StopProcessTree(process.Id);
        }
    }

    private static void StopProcessTree(int processId)
    {
        try
        {
            using var taskkill = Process.Start(new ProcessStartInfo
            {
                FileName = "taskkill.exe",
                Arguments = $"/PID {processId} /T /F",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            });

            taskkill?.WaitForExit(5000);
        }
        catch
        {
            // Best effort cleanup during process exit.
        }
    }

    private static void WaitBeforeExit()
    {
        Console.WriteLine();
        Console.WriteLine("Press any key to close.");
        Console.ReadKey(intercept: true);
    }
}
