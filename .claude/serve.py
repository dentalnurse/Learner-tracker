import http.server, os
os.chdir('/Users/emilywickes/Desktop/Learner-tracker-main')
http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler, port=8099, bind='127.0.0.1')
