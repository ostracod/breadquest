#!/bin/sh

echo "Restarting..."

pkill -f "node breadQuest.js"
sleep 1
NODE_ENV="production" nohup node breadQuest.js > serverMessages.txt 2>&1 &
