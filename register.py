import urllib.request, json
data = json.dumps({"agencyName":"Inservis","name":"Admin","email":"stanislaw.chlebek@gmail.com","password":"changeme123"}).encode()
req = urllib.request.Request("http://127.0.0.1:3001/auth/register", data=data, headers={"Content-Type":"application/json"})
try:
    r = urllib.request.urlopen(req)
    print(r.read().decode())
except urllib.error.HTTPError as e:
    print(e.code, e.read().decode())
except Exception as e:
    print(e)
