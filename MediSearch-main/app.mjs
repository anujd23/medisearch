import path from "path";
const __dirname = path.resolve();
import express from "express";
import ejs from "ejs";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import findOrCreate from "mongoose-findorcreate";

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: "Thisisourlittlesecret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

 mongoose.connect("mongodb+srv://"+"ayushmahariya"+":"+"Ayusha11"+"@cluster0.tuathop.mongodb.net/dentalAnilDB?retryWrites=true&w=majority", {useNewUrlParser:true});
//mongoose.connect("mongodb+srv://"+"anilmaharia"+":"+"anil453"+"@cluster0.tuathop.mongodb.net/dentalDB?retryWrites=true&w=majority", {useNewUrlParser:true});

const professionalsSchema = new mongoose.Schema({
    yourname: String,
    emailId: {
        type:String,
        required: true,
        unique: true
    },
    phoneNumber: String,
    details: String,
    followers: {
        type:Number,
        default:0
    } 
});
const Professional = new mongoose.model("Professional", professionalsSchema);

const ClientsSchema = new mongoose.Schema({
    yourname: String,
    emailId: {
        type:String,
        required: true,
        unique: true
    },
    following: [String]
});
const Client = new mongoose.model("Client", ClientsSchema);

const userSchema = new mongoose.Schema({
    username: String,
    userType: String,
    userId: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", async(req, res)=>{
    // console.log(req.isAuthenticated());
    const professionalList = await Professional.find();
    if(req.isAuthenticated()){
        const userType = req.query.userType;
        const userId = req.query.userId;
        if(userType === "client"){
            const client = await Client.findOne({_id: userId});
            // console.log(client);
            res.render("main", {user: client, userType: userType, isAuthenticated: true, professionalList: professionalList});
        }
        else{
            const professional = await Professional.findOne({_id: userId});
            // console.log(professional);
            res.render("main", {user: professional, userType: userType,  isAuthenticated: true, professionalList: professionalList});
        }
    }
    else{
        res.render("main", {user: [], userType: "",  isAuthenticated: false, professionalList: professionalList});
    }
});
app.get("/loginClient", async(req, res)=>{
    res.render("login", {userType: "client"});
});
app.get("/loginProfessional", async(req, res)=>{
    res.render("login", {userType: "professional"});
});
app.get("/registerClient", async(req, res)=>{
    res.render("register", {userType: "client"});
});
app.get("/registerProfessional", async(req, res)=>{
    res.render("register", {userType: "professional"});
});

app.get("/professionalsProfile", async(req, res)=>{
    if(req.isAuthenticated()){
        const professional = await Professional.findOne({_id:req.query.userId});
        res.render("profile", {user: professional});
    }
    else{
        res.redirect("/loginProfessional");
    }
});

app.post("/professionalsProfile", async(req, res)=>{
    if(req.isAuthenticated()){
        // console.log(req.body);
        const professional = await Professional.findOne({_id:req.body.professionalId});
        // console.log(professional);
        res.render("profile", {user: professional});
    }
    else{
        res.redirect("/loginProfessional");
    }
});

app.post("/editProfile", async(req, res)=>{
    const userId = req.body.userId;
    let yourname = req.body.yourname;
    let phoneNumber = req.body.phoneNumber;
    let professionalDetails = req.body.professionalDetails;
    const professional = await Professional.findOne({_id: userId});
    if(professional){
        if(!professionalDetails){
            professionalDetails = professional.details;
        }
        await Professional.findOneAndUpdate({_id: userId}, {yourname: yourname, phoneNumber:phoneNumber, details: professionalDetails});
        res.redirect(`/professionalsProfile?userId=${userId}`);
    }
    else{
        res.redirect(`/professionalsProfile?userId=${userId}`);
    }
});

app.post("/registerPage", async(req, res)=>{
    const userType = req.body.userType;
    if(userType === "client"){
        res.redirect("registerClient");
    }
    else{
        res.redirect("registerProfessional");
    }
});

app.post("/register", async(req, res) => {
    // console.log(req.body);
    const username = req.body.username;
    const emailId = req.body.emailId;
    const phoneNumber = req.body.phoneNumber;
    const professionalDetails = req.body.professionalDetails;
    const password = req.body.password;
    const userType = req.body.userType;
    let userId = "";
    // console.log(userType);
    // console.log(`${emailId}`);
    const tempUser = await User.findOne({"username": req.body.emailId});
    if(tempUser){
        if(tempUser.userType === "client"){
            res.redirect("/loginClient");
        }
        else{
            res.redirect("/loginProfessional");
        }
    }
    else{
        if(userType === "client"){
            const newClient = await new Client({
                yourname: username,
                emailId: emailId,
                following: []
            });
            await newClient.save();
            const client = await Client.find({emailId: emailId});
            userId = client[0]._id;
        }
        else{
            const newProfessional = await new Professional({
                yourname: username,
                emailId: emailId,
                phoneNumber: phoneNumber,
                details: professionalDetails
            });
            await newProfessional.save();
            const professional = await Professional.find({emailId: emailId});
            userId = professional[0]._id;
        }
        User.register({username:emailId, userType:userType, userId:userId}, password, function(err){
            if(err){
                console.log(err);
                if(userType === "client"){
                    res.redirect("/registerClient");
                }
                else{
                    res.redirect("/registerProfessional");
                }
            }
            else{
                const authenticate = User.authenticate();
                authenticate('username', 'password', function(err, result) {
                    if (!err) { 
                        res.redirect(`/?userId=${userId}&userType=${userType}`);
                    }
                })
            }
        })
    }
})

app.post("/login", async(req, res) => {
    let userId = "";
    // console.log(req.body);
    if(req.body.userType === "client"){
        const client = await Client.findOne({emailId:req.body.emailId});
        if(client){
            userId = client._id;
        }
        else{
            res.redirect("/registerClient")
        }
    }
    else{
        const professional = await Professional.findOne({emailId:req.body.emailId});
        // console.log(professional);
        if(professional){
            userId = professional._id;
        }
        else{
            res.redirect("/registerProfessional");
        }
    }
    const user = await new User({
        username:req.body.emailId,
        userType:req.body.userType,
        userId: userId,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
            if(userType === "client"){
                res.redirect("/loginClient");
            }
            else{
                res.redirect("/loginProfessional");
            }
        }
        else{
            const authenticate = User.authenticate();
            authenticate('username', 'password', function(err, result) {
                if (!err) { 
                    res.redirect(`/?userId=${userId}&userType=${req.body.userType}`);
                }
            })
        }
    })
});

app.post("/follow", async(req, res)=>{ 
    if(req.isAuthenticated() && req.body.userType === "client"){
        const professionalId = req.body.professionalId;
        const professional = await Professional.findOne({_id: professionalId});
        const followers = professional.followers+1;
        await Professional.findOneAndUpdate({_id: professionalId}, {followers: followers});
        const client = await Client.findOne({_id: req.body.userId});
        const following = client.following;
        following.push(professionalId);
        await Client.findOneAndUpdate({_id: req.body.userId}, {following: following});
        res.redirect(`/?userId=${req.body.userId}&userType=${req.body.userType}`);
    }
    else{
        res.redirect("/loginClient");
    }
});

app.listen(3000, ()=>console.log("Server Started at port 3000"));