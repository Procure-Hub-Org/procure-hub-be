const db = require("../../database/models");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const buyerTypeController = require("./buyerTypeController");

exports.register = async (req, res) => {
  try {
    // Validacija unesenih podataka
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      first_name,
      last_name,
      role,
      company_name,
      phone_number,
      address,
      company_address,
      buyer_type,
    } = req.body;

    // Provjera da li korisnik sa istim mailom vec postoji
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        error: "Email already registered",
      });
    }

    // Hesiranje passworda koristeci bcrypt
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    let buyerType = null;
    if (role === "buyer" && buyer_type) {
      buyerType = await buyerTypeController.findBuyerTypeByName(buyer_type);
      // console.log("BuyerType", buyerType);
      if (!buyerType) {
        buyerType = await db.BuyerType.create({ name: buyer_type });
      }
    }
    // Kreiranje novog korisnika
    const user = await db.User.create({
      email,
      password_hash,
      first_name,
      last_name,
      role,
      company_name,
      phone_number,
      address,
      company_address,
      status: "pending",
      buyer_type_id: buyerType ? buyerType.id : null,
    });

    // Uklanjanje hashiranog passworda iz JSON odgovora
    const userResponse = user.toJSON();
    delete userResponse.password_hash;

    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};
