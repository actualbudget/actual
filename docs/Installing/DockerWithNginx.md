---
title: Docker with NGINX
---

## Hosting Actual on a home server with Docker and NGINX

Self-hosting ActualServer provides peace of mind and easy access to maintain your budgets.  The process outline below creates an ActualServer with HTTPS (secure) access on port 9443.  This is accomplished through Docker Compose and NGINX configured as a Reverse Proxy.


## Prerequisites
* Ubuntu Desktop or Server (v22.04 has been tested)
* Install OpenSSL
* Install Docker
* IP address or URL of your machine

### Ubuntu Desktop or Server

Machine running Ubuntu [Desktop](https://ubuntu.com/download/desktop) or [Server](https://ubuntu.com/download/server).  This could be your personal desktop, a laptop, Virtual Machine (VM), server, etc...

### Install OpenSSL

```
sudo apt install openssl
```

### Install Docker

Follow the steps on Docker's Official page to [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/).

### IP Address or URL of your machine

Your machine's IP address or URL is used to generate the self-signed certificates.  Your browser uses these certificates to validate you've connected to the correct server.

If you run an internal DNS server and access your machine through a URL (like `ssh myname@myhost.internal.mydomain.com`), you may want to use the URL to your machine.  If not, or you're unsure, start with you machine's IP address.

The command below will show IP addresses for all network interfaces for your machine. Pick the one associated with the network you will use to access ActualServer.

```bash
ip addr show
```

**Note:** Typically you'll want to pick the address that looks like `192.168.1.123`. Don't worry if you pick the wrong IP address.  The steps below show how to re-generate the certificates if you need to change the IP address.

## Setup Folders and Files

In this next section, a specific set of folders and files are created.  These tell Docker Compose how to connect ActualServer to NGINX, setup NGINX to be a Reverse Proxy, and provide OpenSSL configuration for self-signed certificates.

### Create Folders

Choose a folder on your machine to create the following folders.  This could be your home directory (good starting point) or another path on your hard drive.

```bash
cd <your folder choice>
mkdir -p actual-server/.certs
mkdir -p actual-server/reverse-proxy
mkdir -p actual-server/data
```

Here's how these folders will be used:
* `.certs` will store the self-signed private key and public certificate for the NGINX Reverse Proxy.
* `reverse-proxy` will contain the `Dockerfile` and `nginx.conf` files used to pull the latest NGINX image and customize NGINX to run as a Reverse Proxy.
* `data` contains the server-side storage location for your synced Actual Budgets.  This folder can be manually backed up.  It persists outside of the Docker container (i.e. it won't be deleted when you stop or remove the container).

### Create Files

Let's create the four files needed to configure Docker Compose, NGINX, and prepare for self-sign certificate generation.

* `openssl.conf` assists with OpenSSL self-signed certificate generation
* `Dockerfile` and `nginx.conf` configure NGINX to run as a Reverse Proxy
* `docker-compose.yaml` instructs Docker Compose to spin up two images, ActualServer and NGINX, they are connected via a Docker Network


#### `openssl.conf`

Create `openssl.conf`
```bash
cd actual-server/.certs
nano openssl.conf
```

Past the following contents into `openssl.conf` and replace `123.123.123.123` with your machine's IP address or URL.  Be sure to update ***both*** lines below.
```
[req]
default_bits       = 2048
distinguished_name = req_distinguished_name
req_extensions     = req_ext
x509_extensions    = v3_ca

[req_distinguished_name]
countryName                 = Country Name (2 letter code)
countryName_default         = US
stateOrProvinceName         = State or Province Name (full name)
stateOrProvinceName_default = New York
localityName                = Locality Name (eg, city)
localityName_default        = New York
organizationName            = Organization Name (eg, company)
organizationName_default    = Self Signed Certificate
organizationalUnitName      = organizationalunit
organizationalUnitName_default = ActualServer
commonName                  = Common Name (e.g. server FQDN or YOUR name)
commonName_default          = 123.123.123.123

[req_ext]
subjectAltName = @alt_names

[v3_ca]
subjectAltName = @alt_names

[alt_names]
DNS.1   = 123.123.123.123
```

A quick note on the file above:
* The most important lines above are `commonName_default` and `DNS.1`.  These specify the name of the machine running ActualServer.  When your browser trusts these certificates AND the name of the machine matches the certificates, your browser will show the "secure" or "green" icon for HTTPS.


#### `Dockerfile`

Create `Dockerfile`
```bash
cd actual-server/reverse-proxy
nano Dockerfile
```

Past the following contents into `Dockerfile`
```
FROM nginx:latest

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/nginx.conf
```

Here's what this file is doing:
* `FROM nginx:latest` instructs Docker to pull the latest NGINX image when we call `build` further down in the process.
* `RUN rm /etc/nginx/conf.d/default.conf` removes the default NIGNX config.  This prevents the "Welcome to nginx!" default screen from showing which can interfere with HTTP -> HTTPS redirection.
* `COPY nginx.conf /etc/nginx/conf.d/nginx.conf` loads the Reverse Proxy configuration file into the image.


#### `nginx.conf`

Create `nginx.conf`
```bash
cd actual-server/reverse-proxy
nano nginx.conf
```

Past the following contents into `nginx.conf` and update ***both*** paths below with `<your folder choice>`.
```
#ssl on;  # deprecated, use ssl parameter on the listen directive
ssl_session_cache  builtin:1000  shared:SSL:10m;
ssl_protocols  TLSv1 TLSv1.1 TLSv1.2;
ssl_ciphers HIGH:!aNULL:!eNULL:!EXPORT:!CAMELLIA:!DES:!MD5:!PSK:!RC4;
ssl_prefer_server_ciphers on;

proxy_read_timeout 90;

# # Redirect from HTTP to HTTPS
# server {
#     listen 80;          # Listen for all traffic on port 80
#     server_name _;      # Matches any hostname
#     return 301 https://$host:9443$request_uri;   # 301 tells browser this is a permanent redirect and specifies the HTTPS version of the original request on port 80
# }

server {
    listen 9443 ssl;
    # server_name actualserver.internal.mydomain.com;

    ssl_certificate         /<your folder choice>/actual-server/.certs/selfhost.crt;
    ssl_certificate_key     /<your folder choice>/actual-server/.certs/selfhost.key;

    location / {
        proxy_pass http://actualserver:5006/;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

A couple notes on the file above:
* This Reverse Proxy is setup to serve ActualServer on port 9443.  Feel free to change this port. *Make sure* to also update the `ports` section of the `nginx` in `docker-compose.yaml` below.
* It is possible to run multiple Reverse Proxies with the same NGINX instance.  The commented line `# server_name actualserver.internal.mydomain.com` is intended to provide a starting point if you'd like to pursue this.  Recommend looking up examples on how to use `server_name` with NGINX.
* The `Redirect from HTTP to HTTPS` section is provided as a starting point if you'd like to enable NGINX to automatically redirect browsers to SSL on port 9443.  If you enable this section, also un-comment line `80:80` in `docker-compose.yaml` below.


#### `docker-compose.yaml`

Create `docker-compose.yaml`
```bash
cd actual-server/
nano docker-compose.yaml.conf
```

Past the following contents into `docker-compose.yaml` and update ***both*** paths below with `<your folder choice>`.
```
version: '2.1'
services:
  actual-server:
    image: jlongster/actual-server:latest
    restart: always
    # ports:
    #   - 5006:5006
    volumes:
      - /<your folder choice>/actual-server/data:/data
    networks:
      frontend:
        aliases:
          - actualserver

  nginx:
    build: ./reverse-proxy
    restart: always
    ports:
      # - 80:80
      - 9443:9443
    volumes:
      - /<your folder choice>/actual-server/.certs:/etc/nginx/certs:ro
    networks:
      frontend:

networks:
  frontend:
```

A couple notes on the container and network setup:
* Two images are spun-up.  One is the NGINX Reverse Proxy which uses the `reverse-proxy/Dockerfile` to build the image.  The other is ActualServer.
* NGINX and ActualServer are networked together by the `frontend` network which is not publicly accessible.
* Port `5006` for ActualServer is commented out.  This provides HTTP (non-encrypted) access.  Recommend enabling this only for debugging issues.
* ActualServer is given the alias `actualserver` on the `frontend` network. This sets the DNS name for ActualServer on the `frontend` network.  Why do this?  It enables NGINX's configuration to be more human-readable.  See this line: `proxy_pass http://actualserver:5006/`
* Port `9443` is made public for the NGINX image.  This enables you to hit the Reverse Proxy which forwards your requests to ActualServer.


## Certificates

In this section, we'll create self-signed certificate for NGINX to use to encrypt the traffic between your browser and NGINX.

### Generate Certs

Run the following command to generate certs, press `ENTER` at each prompt without changing the content.

```bash
cd actual-server/.certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout selfhost.key -out selfhost.crt -config openssl.conf
```

### Re-generate Certs

To re-generate the certificates (change your machines IP address or URL), delete the key and certificate, and then generate certs.

```bash
cd actual-server/.certs
rm selfhost.*
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout selfhost.key -out selfhost.crt -config openssl.conf
```


## Managing The Server

This section covers typical actions required to manage the server

### Start Server

```bash
cd actual-server/
sudo docker compose up -d
```

**Note:** Omit `-d` to leave the console connected to the containers.  This enables status and error messages to show.  When done viewing the status and error messages, press `CTRL+C` to stop the containers, then start the server with `-d`.

### Stop Server

```bash
cd actual-server/
sudo docker compose down
```

**Note:** Your budgets are saved outside the Docker containers in folder `actual-server/data`  on your machine.  They will not be deleted when you bring the server down.

### Configuration File Change

When `Dockerfile` or `nginx.conf` files are modified, run `build` to create new NGINX image with the changes, then run `up` to re-launch the server.

```bash
cd actual-server/
sudo docker compose build
sudo docker compose up -d
```

When the certificates or `docker-compose.yaml` files are modified, stop and then start the server.
```bash
cd actual-server/
sudo docker compose down
sudo docker compose up -d
```

### Backing up the Server

This section outlines one method of performing a server backup.

First, choose a location to store the backups: create a parent folder, create a snapshot folder
```bash
mkdir /<backup folder>/actual-server-backups
cd /<backup folder>/actual-server-backups
mkdir 20230101       # This is the snapshot folder
```

Then, stop the server
```bash
cd actual-server/
sudo docker compose down
```

Copy the contents of `data` into the snapshot folder
```bash
cd actual-server/
cp -R data/ /<backup folder>/actual-server-backups/20230101
```

Last, start the server
```bash
cd actual-server/
sudo docker compose up -d
```

### Restoring the Server

This section outlines one method of restoring a server backup.

First, stop the server
```bash
cd actual-server/
sudo docker compose down
```

Delete the server's `data` folder
```bash
cd actual-server/
rm -rf data
```

Copy the desired backup
```bash
cd actual-server/
cp -R /<backup folder>/actual-server-backups/20230101/data/ .
```

Last, start the server
```bash
cd actual-server/
sudo docker compose up -d
```

When you browse to your ActualServer, the budgets should reflect the restored backup.


### Docker Image Updates

When new versions of ActualServer or NGINX are released, perform the following commands to pull the new images and re-launch the server.

**Note:** Recommend performing a backup BEFORE upgrading ActualServer images!

```bash
cd actual-server/
sudo docker compose pull
sudo docker compose up -d
```

## Browse to ActualServer

Your ActualServer is now usable by any device on your local network.  

Access your server with the URL below (replace `123.123.123.123` with the IP address or URL you configured):
```
https://123.123.123.123:9443
```

## Debugging Issues

Here are a couple issues and solutions when setting up ActualServer with NGINX Reverse Proxy

### I've started the server, what do I look for?

Launch the server with `sudo docker compose up` (omit `-d` so the logs are shown).  Look for any errors.

The following are "good" outputs:
```
actual-server-nginx-1          | 2023/01/14 15:34:11 [notice] 1#1: start worker processes
actual-server-nginx-1          | 2023/01/14 15:34:11 [notice] 1#1: start worker process 20
actual-server-nginx-1          | 2023/01/14 15:34:11 [notice] 1#1: start worker process 21
actual-server-nginx-1          | 2023/01/14 15:34:11 [notice] 1#1: start worker process 22
actual-server-nginx-1          | 2023/01/14 15:34:11 [notice] 1#1: start worker process 23
actual-server-actual-server-1  | Listening on 0.0.0.0:5006...
```

As browsers access ActualServer, NGINX will log the requests to the console.  

Outputs to the console like `exited with code 1` and others may indicate something is wrong with the configuration or files.

### Troubleshooting network access

Recommend launching the server with `sudo docker compose up` (omit `-d`).

Use the `curl` command to see if NGINX is reachable (use HTTP, it will cause NGINX to return the error in plain-text):
```
curl http://123.123.123.123:9443
```

You should get a response similar to this:
```
<html>
<head><title>400 The plain HTTP request was sent to HTTPS port</title></head>
<body>
<center><h1>400 Bad Request</h1></center>
<center>The plain HTTP request was sent to HTTPS port</center>
<hr><center>nginx/1.23.3</center>
</body>
</html>
```

Also check the console running the server.  You should see an access attempt recorded by NGINX (look at the last line).  
```
actual-server-nginx-1          | 2023/01/14 15:34:11 [notice] 1#1: start worker process 22
actual-server-nginx-1          | 2023/01/14 15:34:11 [notice] 1#1: start worker process 23
actual-server-actual-server-1  | Listening on 0.0.0.0:5006...
actual-server-nginx-1          | 123.123.123.123 - - [14/Jan/2023:15:34:33 +0000] "GET / HTTP/1.1" 400 255 "-" "curl/7.81.0" "-"
```

If you've made it to this point, the server is running and properly configured.  

A couple thoughts:
* The IP address chosen in section **IP Address or URL of your machine** may not be accessible by other devices on your network.  Recommend using `ping` between machines to verify the correct IP address and then update the server configuration.
* There may be an issue with your machine's firewall (unlikely, Docker controls the firewall).
* There may be an issue with your home network setup.


### NGINX continuously shows `exited with code 1`

If you start ActualServer and see NGINX scrolling the error below
```
actual-server-nginx-1 exited with code 1
actual-server-nginx-1 exited with code 1
actual-server-nginx-1 exited with code 1
````

you may have a configuration file issue.  Recommend double checking the paths to the certificates.  Verify they're correct in **both** `docker-compose.yaml` and `nginx.conf`


## References

* https://www.humankode.com/ssl/create-a-selfsigned-certificate-for-nginx-in-5-minutes/
* https://serverfault.com/questions/828130/how-to-run-nginx-ssl-on-non-standard-port#828135