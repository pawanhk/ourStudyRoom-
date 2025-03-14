document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup script loaded!");
    // get all the required html elements
    const createRoomB = document.getElementById("createRoom") as HTMLButtonElement;
    const joinRoomB = document.getElementById("joinRoom") as HTMLButtonElement;
    const roomCodeI = document.getElementById("roomCode") as HTMLInputElement;
    const statusT = document.getElementById("status") as HTMLParagraphElement;

    const hostT = document.getElementById("room-code") as HTMLSpanElement;
    const roomT = document.getElementById("host-name") as HTMLSpanElement;

    const timerD = document.getElementById("my-timer") as HTMLHeadElement;
    const setU = document.getElementById("set-up") as HTMLButtonElement;
    const setD = document.getElementById("set-down") as HTMLButtonElement; 
    const setS = document.getElementById("start-timer") as HTMLButtonElement;

    const atD = document.getElementById("all-timers") as HTMLDivElement;

    // has the user already joined the room or created the roomn 
    chrome.storage.local.get(["roomCode","username"],(data) => {
        if(data.roomCode && data.username){
            statusT.textContent = `Joining Back: ${data.roomCode} for user ${data.username}`;
            chrome.runtime.sendMessage({type: "JOIN_ROOM",roomCode:data.roomCode,username:data.username},(response) => {
                if(response?.status === "success"){
                    statusT.textContent = `Room: ${data.roomCode}`;
                    roomT.textContent = data.roomCode;
                    //get the data from the source
                    if(data.username.substring(0,4) != "Host"){
                        chrome.storage.local.get(['username'],(userData) => {
                            hostT.textContent = userData.username;
                        });
                    }else{
                        chrome.storage.local.get(['hostName'],(hostData) => {
                            hostT.textContent = hostData.hostName;
                        });
                    }
                }else{
                    statusT.textContent = "Could not join back the room";
                    hostT.textContent = "XXXX";
                    roomT.textContent = "XXXX";
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
                chrome.storage.local.set({roomCode, username, hostName: username});
                statusT.textContent = `Room Created: ${response.roomCode}`;

                // rejoin for the host ?
                chrome.runtime.sendMessage({type: "JOIN_ROOM", roomCode, username }, (joinResponse) => {
                    if (joinResponse?.status === "success") {
                        statusT.textContent = `Joined Room: ${roomCode}`;
                        hostT.textContent = username;
                        roomT.textContent = roomCode;
                    }
                });
            }else{
                statusT.textContent = "Room could not be created :(";
                hostT.textContent = "XXXX";
                roomT.textContent = "XXXX";
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
                roomT.textContent = roomCode;
                //get the data from the source
                //get the data from the source
                if(username.substring(0,4) != "Host"){
                    chrome.storage.local.get(['username'],(userData) => {
                        hostT.textContent = userData.username;
                    });
                }else{
                    chrome.storage.local.get(['hostName'],(hostData) => {
                        hostT.textContent = hostData.hostName;
                    });
                }

            }else{
                statusT.textContent = "Could not join the Room";
                hostT.textContent = "XXXX";
                roomT.textContent = "XXXX";
            }
        });
    });


    // check for room updates now 
    chrome.runtime.onMessage.addListener((message) => {
        if(message.type == "ROOM_UPDATE"){
            statusT.textContent = `Users in Room (${message.roomCode}): ${message.users.join(", ")}`;
            roomT.textContent = message.roomCode;

            //get the data from the source
            /*
            if(message.username.substring(0,4) != "Host"){
                chrome.storage.local.get(['username'],(userData) => {
                    hostT.textContent = userData.username;
                });
            }else{
                chrome.storage.local.get(['hostName'],(hostData) => {
                    hostT.textContent = hostData.hostName;
                });
            }
                */
            
            // display all user timers
            atD.innerHTML = `<h3>All Timers:</h3>`;
            for(const [user,time] of Object.entries(message.timers || {})){
                atD.innerHTML += `<p>${user}: ${formatTime(time as number)}</p>`;
            }

        }
    });

    // TIMER STUFF GOES HERE 
    let userTimer = 0;
    let countdownInterval: number | undefined;

    // make suure the room exists again 
    chrome.storage.local.get(['username'],(data) => {
        if(data.roomCode && data.username){
            console.log("Room was loaded properly");
        }
    });

    // update the timer

    function updateTimer(newTime: number){
        chrome.storage.local.get(['roomCode','username'],(data) => {
            if(!data.roomCode && !data.username){
                return;
            }

            userTimer = newTime;
            timerD.textContent = formatTime(userTimer);

            // update background service worker 
            chrome.runtime.sendMessage({
                type: "UPDATE_TIMER",
                roomCode: data.roomCode,
                username: data.username,
                time: userTimer
            });
        });
    }

    // step up the timer
    setU.addEventListener("click",() => {
        updateTimer(userTimer + 300);
    });

    setD.addEventListener("click", () => {
        updateTimer(Math.max(0,userTimer-300));
    }) 

    setS.addEventListener("click", () => {
        // clear an existing timer 
        if (countdownInterval !== undefined) {
            clearInterval(countdownInterval);
        }
    
        countdownInterval = window.setInterval(() => {
            if(userTimer > 0) {
                // remove 1 second 
                updateTimer(userTimer - 1);
            }else {
                if(countdownInterval !== undefined) {
                    clearInterval(countdownInterval);
                    countdownInterval = undefined;
                }
            }
        }, 1000);
    });

    // formatting the time function here -- basic number convertions
    function formatTime(seconds:number): string{
        const hrs = Math.floor(seconds/3600);
        const mins = Math.floor((seconds % 3600)/60);
        const secs = seconds % 60; 
        // 00:00:00 formatted
        return `${String(hrs).padStart(2, "0")} : ${String(mins).padStart(2, "0")} : ${String(secs).padStart(2, "0")}`;
    }
    



});