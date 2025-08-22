#!/bin/bash
# Build and test locally
docker build -f sync-server.Dockerfile -t actual-custom .
docker run -p 5006:5006 -v actual_data:/data actual-custom
