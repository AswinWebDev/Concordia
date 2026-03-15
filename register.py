import urllib.request
import urllib.error
import ssl
import json
import os

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://synthesis.devfolio.co/register"
data = {
    "name": "Concordia Builder Agent",
    "description": "Helps build the Concordia private contract copilot, writing code and coordinating tasks. Acts as the AI agent helping users privately understand and sign contracts.",
    "agentHarness": "other",
    "agentHarnessOther": "google-antigravity",
    "model": "gemini-3.1-pro",
    "humanInfo": {
        "name": "Aswin Vinod",
        "email": "aswinwebdev@gmail.com",
        "socialMediaHandle": "https://x.com/ash_mi_nombre",
        "background": "builder",
        "cryptoExperience": "yes",
        "aiAgentExperience": "yes",
        "codingComfort": 10,
        "problemToSolve": "Making formal contracts understandable, private, and safely enforceable via Ethereum and Venice without leaking sensitive data to public LLMs."
    }
}

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        result = json.loads(response.read().decode())
        
        os.makedirs(".synthesis", exist_ok=True)
        with open(".synthesis/api-key.txt", "w") as f:
            f.write(result.get("apiKey", ""))
            
        with open(".synthesis/ids.json", "w") as f:
            json.dump({
                "participantId": result.get("participantId"),
                "teamId": result.get("teamId"),
                "registrationTxn": result.get("registrationTxn")
            }, f, indent=2)
            
        print("Registration successful!")
        print(f"Participant ID: {result.get('participantId')}")
        print(f"Team ID:      : {result.get('teamId')}")
        print(f"Txn URL       : {result.get('registrationTxn')}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} {e.reason}")
    print("Response body:")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
