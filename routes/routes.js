const express = require("express");
const router = express.Router();
const User = require("../models/users");
const multer = require('multer');
const fs = require('fs');

// Image upload configuration
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads');
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
});

var upload = multer({
    storage: storage,
}).single("image");

// Route to insert a new user into the database
router.post('/add', upload, async (req, res) => {
    const user = new User({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        image: req.file.filename,
    });

    try {
        // Save the user
        await user.save();
        req.session.message = {
            type: 'success',
            message: 'User added successfully!',
        };
        res.redirect("/");
    } catch (err) {
        req.session.message = {
            type: 'danger',
            message: err.message,
        };
        res.redirect("/add");
    }
});

// Route to get all users and render the index page
router.get("/", async (req, res) => {
    try {
        const users = await User.find();  // Using await instead of exec() and callback
        res.render("index", {
            title: "Home Page",
            users: users,
            message: req.session.message
        });
        // Clear message after rendering
        delete req.session.message;
    } catch (err) {
        console.log(err);
        res.status(500).send("Error retrieving users");
    }
});

// Route to render "add user" form
router.get("/add", (req, res) => {
    res.render("add_users", { title: "Add User" });
});

//Edit a user route
router.get('/edit/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.redirect('/'); // Handle user not found
        }
        res.render("edit_users", {
            title: "Edit users",
            user: user,
        });
    } catch (err) {
        console.log(err);
        res.redirect('/'); // Handle error
    }
});

// Update user route (asynchronous/await)
router.post('/update/:id', upload, async (req, res) => {
    const id = req.params.id;
    let new_image = '';

    if(req.file) {
        new_image = req.file.filename;
        try {
            // Delete the old image if a new one is uploaded
            await fs.promises.unlink(`./uploads/${req.body.old_image}`);
        } catch (err) {
            console.log(err);
        }
    } else {
        new_image = req.body.old_image;
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(id, {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            image: new_image,
        }, { new: true });  // Return the updated document

        if (!updatedUser) {
            return res.json({ message: 'User not found', type: 'danger' });
        }

        req.session.message = {
            type: "success",
            message: "User updated successfully",
        };
        res.redirect("/");
    } catch (err) {
        console.log(err);
        res.json({ message: err.message, type: 'danger' });
    }
});

// Delete user route (using findByIdAndDelete)
router.get('/delete/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.json({ message: 'User not found', type: 'danger' });
    }

    if (user.image) {
      try {
        await fs.unlink(`./uploads/${user.image}`); // Delete the old image
      } catch (err) {
        console.log(err);
      }
    }

    req.session.message = {
      type: "info",
      message: "User deleted successfully!"
    };

    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.json({ message: err.message, type: 'danger' });
  }
});


// Export the router
module.exports = router;