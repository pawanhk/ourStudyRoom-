// imports 
import {db} from "./firebaseConfig";
import {doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion} from "firebase/firestore";

// create an interface so types are maintained
interface Message{
    type: "JOIN_ROOM" | "CREATE_ROOM";
    roomCode ?: string;
    username ?: string;
}

// listen for anyone joining the room 
chrome.runtime.onMessage.addListener((message: Message,_,sendResponse) => {
    if(message.type == "JOIN_ROOM"){
        if(message.type == "JOIN_ROOM" && message.roomCode && message.username){
            joinRoom(message.roomCode,message.username,sendResponse);
        }
    }else if(message.type == "CREATE_ROOM"){
        createNewRoom(sendResponse);
    }
    return true;
});

// create the room and an empty array for the users to join 

async function createNewRoom(sendResponse: (response:any) => void){
    // create the random code now
    const roomCode = Math.random().toString(36).substring(2,8).toUpperCase();
    try{
        await setDoc(doc(db,"rooms",roomCode), {users: [] });
        sendResponse({status: "success",roomCode: roomCode});
    }catch(error){
        sendResponse({status:"error",message:"Failed to create the room"});
    }
}


// join the room using the code 
async function joinRoom(roomCode:string,username:string,sendResponse: (response:any) => void){
    // check if the room exists
    const roomRef = doc(db,"rooms",roomCode);
    const roomSnap = await getDoc(roomRef);

    if(!roomSnap.exists()){
        sendResponse({status:"error",message:"Room does not exist"});
        return;
    }
    // check if the room is full now
    const roomData = roomSnap.data();
    if(roomData.users.length >= 5){
        sendResponse({status:"error",message:"Room is full"});
        return;
    }

    // Now add the user to the room
    try{
        await updateDoc(roomRef,{users: arrayUnion(username)});
        roomUpdate(roomCode);
        sendResponse({status: "success" });
    }catch(error){
        sendResponse({status:"error",message:"Failed to join the room"});
    }
}


// keep checking if an update has been detected
function roomUpdate(roomCode: string){
    const roomRef = doc(db, "rooms", roomCode);
    onSnapshot(roomRef, (snapshot) =>{
        if (snapshot.exists()){
            const roomData = snapshot.data();
            chrome.runtime.sendMessage({
                type: "ROOM_UPDATE",
                roomCode: roomCode,
                users: roomData.users
            });
        } else {
            console.warn(`⚠️ Room ${roomCode} no longer exists.`);
        }
    });
}

// TIMER STUFF FOES HERE 
