#!/bin/sh

# Sync code
git init
git remote add origin https://github.com/JosiasAurel/sinerider-scoring.git
git pull
git checkout main -f
git branch --set-upstream-to origin/main
npm install
npm run build
npm run start
