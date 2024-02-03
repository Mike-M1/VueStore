import express from "express";
import { MongoClient } from "mongodb";
import { cartItems as cartItemsRaw, products as productsRaw } from "./tempdata";
import path from "path";

let cartItems = cartItemsRaw;
let products = productsRaw;

async function start() {
  const url = `mongodb+srv://fsv:password123!!@cluster0.ywvl0rb.mongodb.net/?retryWrites=true&w=majority`;
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db("fsv-db");

  const app = express();
  app.use(express.json());

  app.use("/images", express.static(path.join(__dirname, "../shoeimages")));

  /* Algo to search for objects based on ids given as arguments*/
  async function populateCartIds(ids) {
    return Promise.all(
      ids.map((id) => db.collection("products").findOne({ id }))
    );
  }

  /* The idea is that the code has to conform to the db design. And in the db you have individual carts assigned to specific users. So this is saying before you can get a cart you must give me a user so I can know which cart to get*/

  app.get("/api/users/:userId/cart", async (req, res) => {
    const user = await db
      .collection("users")
      .findOne({ id: req.params.userId });
    console.log(user.cartItems);
    const populatedCart = await populateCartIds(user.cartItems);
    res.json(populatedCart);
  });

  app.get("/api/products", async (req, res) => {
    const products = await db.collection("products").find({}).toArray();
    res.send(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const productId = req.params.id;
    const product = await db.collection("products").findOne({ id: productId });
    res.json(product);
  });

  app.post("/api/users/:uId/cart", async (req, res) => {
    const userId = req.params.uId;
    const productId = req.body.id;

    /* In the tutorial the next line is deleted because we just need the id and that is given in the 1st line of the function. But that could lead to problems because what if the product corresponding to the productId is out of stock or whatever. You need to check if the productId has a corresponding object in the db. */
    /* const product = products.find((product) => product.id === productId); */

    await db
      .collection("users")
      .updateOne({ id: userId }, { $addToSet: { cartItems: productId } });

    const user = await db.collection("users").findOne({ id: userId });
    const populatedCart = await populateCartIds(user.cartItems);
    console.log(populatedCart);
    res.json(populatedCart);
  });

  app.delete("/api/users/:userId/cart/:productId", async (req, res) => {
    const userId = req.params.userId;
    const productId = req.params.productId;

    /* This line is saying "if the item i am currently viewing in the array is not the same as the item sent in the request then I will put the item in a new array(a filtered array)*/

    await db.collection("users").updateOne(
      { id: userId },
      {
        $pull: { cartItems: productId },
      }
    );

    const user = await db
      .collection("users")
      .findOne({ id: req.params.userId });
    const populatedCart = await populateCartIds(user.cartItems);
    console.log(populatedCart);
    res.json(populatedCart);
  });

  app.listen(8080, () => {
    console.log("Server is running on port 8080");
  });
}

start();
