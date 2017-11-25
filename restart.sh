
echo "Restarting..."

pkill -f "node breadQuest.js"
NODE_ENV="production" nohup node breadQuest.js > serverMessages.txt 2>&1 &
