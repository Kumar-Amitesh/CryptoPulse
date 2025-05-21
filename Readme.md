## Assignment Objective

- This assignment is designed to assess your ability to build a full backend system, interact with external APIs, use databases, and work with background jobs and event queues.
- You are required to build **two Node.js servers** using **MongoDB** and [**NATS](https://nats.io/)(or equivalent event queue)**. The two servers will communicate to collect and expose cryptocurrency statistics.
- You’re free to use AI tools to help you with building the application.

## Task 1

- Build an API Server(name: api-server) with the following requirements:
- Write a function `storeCryptoStats()` that:
    - Uses the [CoinGecko API](https://docs.coingecko.com/v3.0.1/reference/introduction) to fetch the **current price in USD**, **market cap in USD**, and **24-hour change %** of the following 3 coins:
        - **bitcoin**
        - **ethereum**
        - **matic-network**
    - Stores these stats in a MongoDB collection.
    - You will have to use the [CoinGecko API documentation](https://docs.coingecko.com/v3.0.1/reference/introduction) to find the appropriate endpoint that would solve the above purpose.

## Task 2

- Implement an API `/stats`, that will return the latest data about the requested cryptocurrency.
- Query params:

```jsx
{
	coin: `bitcoin` // Could be one of the above 3 coins
}
```

- Sample Response:

```jsx
{
	price: 40000,
	marketCap: 800000000,
	"24hChange": 3.4
}
```

## Task 3

- Implement an API, `/deviation`, that will return the standard deviation of the price of the requested cryptocurrency for the last 100 records stored by the background service in the database.
- For example, consider the database only has 3 records for `bitcoin`, each with a price of 40000, 45000, 50000 respectively. Then the result should return 4082.48.
- Query params:

```jsx
{
	coin: `bitcoin` // Could be one of the above 3 coins
}
```

- Sample Response:

```jsx
{
	deviation: 4082.48
}
```

## Task 4

- Build a new server(name: worker-server) that runs a **background job** every 15 minutes:
    - Every 15 minutes, publish an event to the Nats event queue. You may also use any alternative of Nats, like Kafka, Redis pub-sub etc.
    - The message can be simple, like:
    
    ```json
    { "trigger": "update" }
    ```
    
- The `api-server` should **subscribe** to the above event. Upon receiving the event, it should trigger the `storeCryptoStats()` function.

## Success Criteria

- Working `/stats` and `/deviation` APIs.
- Background job running every 15 mins that publish an event to Nats(or any other event queue)
- Inter-server communication via **NATS** only(or any other event queue)
- MongoDB schema properly structured
- Code quality, folder structure, and documentation

## **Optional Tasks**

1. Deploy your database using MongoDB Atlas or other similar tools.
2. Deploy your backend using platforms like Heroku or any cloud platform like AWS, GCP or Azure and expose the API to the public.

## Submission Guidelines

- Create a GitHub repository with 2 folders:

```jsx
/api-server
/worker-server
```

- Each folder must contain:
    - Code
    - `README.md` with setup instructions
- Ensure that this is a private repository and share collaborator access with admin@koinx.com.
- Once you’re done with the tasks below, please submit your details and the links in this form: https://forms.gle/zNGnv8prevFPNNNv9.

**Notes:-**

1. Think of this assignment as a production grade project. Using best practices, writing clean code etc. will fetch you additional points.
2. Do think well about how you want to design your database schemas.
3. We care about the usage of version control and the way you structure(and name) your commits!