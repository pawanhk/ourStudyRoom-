document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup script loaded!");
    // get all the required html elements
    const createRoomB = document.getElementById("createRoom") as HTMLButtonElement;
    const joinRoomB = document.getElementById("joinRoom") as HTMLButtonElement;
    const roomCodeI = document.getElementById("roomCode") as HTMLInputElement;
    const statusT = document.getElementById("status") as HTMLParagraphElement;

    // has the user already joined the room or created the roomn 
    chrome.storage.local.get(["roomCode","username"],(data) => {
        if(data.roomCode && data.username){
            statusT.textContent = `Joining Back: ${data.roomCode} for user ${data.username}`;
            chrome.runtime.sendMessage({type: "JOIN_ROOM",roomCode:data.roomCode,username:data.username},(response) => {
                if(response?.status === "success"){
                    statusT.textContent = `Room: ${data.roomCode}`;
                }else{
                    statusT.textContent = "Could not join back the room";
                    chrome.storage.local.remove(['roomCode','username']);
                }
            })
        }else{

        }
    })

    // listen for someone hosting a room 
    createRoomB.addEventListener("click", () => {
        chrome.runtime.sendMessage({type: "CREATE_ROOM"}, (response) => {
            if(response.status == "success"){
                const roomCode = response.roomCode;
                const username = `Host-${Math.random().toString(36).substring(2, 6)}`;
                chrome.storage.local.set({roomCode, username });
                statusT.textContent = `Room Created: ${response.roomCode}`;

                // rejoin for the host ?
                chrome.runtime.sendMessage({type: "JOIN_ROOM", roomCode, username }, (joinResponse) => {
                    if (joinResponse?.status === "success") {
                        statusT.textContent = `Joined Room: ${roomCode}`;
                    }
                });
            }else{
                statusT.textContent = "Room could not be created :(";
            }
        });
    });

    // listen for somone joining a room 
    joinRoomB.addEventListener("click",() => {
        // get the input value first
        const roomCode = roomCodeI.value.trim();
        // if they did not enter a room code 
        if(!roomCode){
            statusT.textContent = "Enter a code to join dumbass";
            return;
        }
        // generate a random username first 
        const username = `User-${Math.random().toString(36).substring(2,6)}`;
        chrome.storage.local.set({ roomCode, username });

        chrome.runtime.sendMessage({type:"JOIN_ROOM",roomCode,username}, (response) => {
            if(response.status == "success"){
                statusT.textContent = `Joined Room: ${roomCode}`;
            }else{
                statusT.textContent = "Could not join the Room";
            }
        });
    });


    // check for room updates now 
    chrome.runtime.onMessage.addListener((message) => {
        if(message.type == "ROOM_UPDATE"){
            statusT.textContent = `Users in Room (${message.roomCode}): ${message.users.join(", ")}`;
        }
    })


})