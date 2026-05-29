import { ChatRequest } from "./plugin"
import { AICharacter, AIConversation } from "./AI"

type Storage = {
    Characters: AICharacter[]
    Conversations: AIConversation[]
}

class StorageManager {
    Storage: Storage

    constructor(){
        this.Storage = {Characters:[], Conversations:[]}
    }
}