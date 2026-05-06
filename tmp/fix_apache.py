f='/usr/local/directadmin/data/users/inservis/httpd.conf'
lines=open(f).readlines()
p1='    ProxyPreserveHost On\n'
p2='    ProxyRequests Off\n'
p3='    ProxyPass /api/ http://127.0.0.1:3001/\n'
p4='    ProxyPassReverse /api/ http://127.0.0.1:3001/\n'
p5='    ProxyPass / http://127.0.0.1:3000/\n'
p6='    ProxyPassReverse / http://127.0.0.1:3000/\n'
lines[336:336]=[p1,p2,p3,p4,p5,p6]
open(f,'w').writelines(lines)
print('Done')
