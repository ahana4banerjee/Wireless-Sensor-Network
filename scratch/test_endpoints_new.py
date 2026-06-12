import urllib.request
import json

endpoints = [
    "http://127.0.0.1:8000/api/system-score",
    "http://127.0.0.1:8000/api/network-health",
    "http://127.0.0.1:8000/api/network-predictions?limit=5"
]

for url in endpoints:
    print(f"Testing URL: {url}")
    try:
        with urllib.request.urlopen(url) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"Status: {status}")
            parsed = json.loads(body)
            # Print a clean, formatted sample of the response
            if isinstance(parsed, list):
                print(f"Received list with {len(parsed)} items. First item sample:")
                if len(parsed) > 0:
                    print(json.dumps(parsed[0], indent=2))
            else:
                print(json.dumps(parsed, indent=2))
    except Exception as e:
        print(f"Error testing {url}: {e}")
    print("-" * 50)
