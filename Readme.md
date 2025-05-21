## CryptoPulse

- This api is designed to assess your ability to build a full backend system, interact with external APIs, use databases, and work with background jobs and event queues.
- Build **two Node.js servers** using **MongoDB** and [**NATS](https://nats.io/)(or equivalent event queue)**. The two servers will communicate to collect and expose cryptocurrency statistics.

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
