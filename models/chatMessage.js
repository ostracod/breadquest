
var chatMessageList = [];
var nextChatMessageId = 0;

function ChatMessage(username, text) {
    this.id = nextChatMessageId;
    nextChatMessageId += 1;
    this.username = username;
    this.text = text;
    var tempDate = new Date();
    this.time = tempDate.getTime();
    chatMessageList.push(this);
    if (chatMessageList.length > 100) {
        chatMessageList.shift();
    }
}

function getNextChatMessageId() {
    return nextChatMessageId;
}

function announceMessageInChat(message) {
    new ChatMessage(null, message);
}

module.exports = {
    ChatMessage: ChatMessage,
    chatMessageList: chatMessageList,
    getNextChatMessageId: getNextChatMessageId,
    announceMessageInChat: announceMessageInChat
}

