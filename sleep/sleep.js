
function main(){
 let  ped = true
 print("Here is your level: 7 ")
 print("What time do you want to sleep at: ")
 const userInput = document.getElementById('myInputId').value;
 print(userInput)
 while (ped != False){
    print("press 1 to see time: ")
    const userInput = document.getElementById('myInputId').value;
    let x = new Date()
    if (userInput == 1){
        print(x)
    }
 }    

}
document.getElementById("demo").innerHTML = main();