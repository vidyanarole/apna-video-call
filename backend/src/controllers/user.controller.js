import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt, { hash } from "bcrypt"

import crypto from "crypto"
import { Meeting } from "../models/meeting.model.js";
const login = async (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Please Provide" })
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" })
        }


        let isPasswordCorrect = await bcrypt.compare(password, user.password)

        if (isPasswordCorrect) {
            let token = crypto.randomBytes(20).toString("hex");

            user.token = token;
            await user.save();
            return res.status(httpStatus.OK).json({ token: token })
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Username or password" })
        }

    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` })
    }
}


const register = async (req, res) => {
    const { name, username, password } = req.body;


    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.FOUND).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });

        await newUser.save();

        res.status(httpStatus.CREATED).json({ message: "User Registered" })

    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }

}


const getUserHistory = async (req, res) => {
    const { token } = req.query;

    console.log("[BACKEND DEBUG] getUserHistory endpoint triggered");
    console.log("-> Query Parameters:", req.query);
    console.log("-> Headers:", req.headers);

    if (!token) {
        console.warn("[BACKEND WARNING] Token is missing from query!");
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Token is required" });
    }

    try {
        const user = await User.findOne({ token: token });
        if (!user) {
            console.warn("[BACKEND WARNING] No user found with the provided token!");
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or expired session token" });
        }
        const meetings = await Meeting.find({ user_id: user.username });
        console.log(`[BACKEND DEBUG] Found ${meetings.length} meetings for user: ${user.username}`);
        return res.status(httpStatus.OK).json(meetings);
    } catch (e) {
        console.error("[BACKEND ERROR] Error in getUserHistory:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${e.message}` });
    }
}

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    console.log("[BACKEND DEBUG] addToHistory endpoint triggered");
    console.log("-> Request Body:", req.body);
    console.log("-> Headers:", req.headers);

    if (!token || !meeting_code) {
        console.warn("[BACKEND WARNING] Token or meeting_code missing in request body!");
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Token and meeting code are required" });
    }

    try {
        const user = await User.findOne({ token: token });
        if (!user) {
            console.warn("[BACKEND WARNING] No user found with the provided token!");
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or expired session token" });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        })

        await newMeeting.save();
        console.log(`[BACKEND DEBUG] Successfully saved meeting ${meeting_code} to history of user ${user.username}`);
        return res.status(httpStatus.CREATED).json({ message: "Added code to history" });
    } catch (e) {
        console.error("[BACKEND ERROR] Error in addToHistory:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${e.message}` });
    }
}


export { login, register, getUserHistory, addToHistory }