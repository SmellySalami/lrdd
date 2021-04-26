# La Room de Discode GraphQL Documentation

## Users API

### Query
- description: sign in a user
- request `POST https://lrdd-server.herokuapp.com/graphql`
    - credentials: include
    - content-type: `application/json`
    - accept: `application/json`
    - body: query
        - tokenId: (String) user's token from Google login
        ```
        query {
            signIn(tokenId: "aj0sncnaksl9c112cjiop")
        }
        ```
    - response: Valid token
        - body: (Boolean) user signed in
        ```
        {
            "data": {
                "signIn": true
            }
        }
        ```
    - response: Invalid token
        - body: (Boolean) user not signed in
        ```
        {
            "data": {
                "signIn": false
            }
        }
        ```
- ### Get Google login tokenId:
    - Head to Google's [OAuth Playground](https://developers.google.com/oauthplayground/)
    - Authorise Google OAuth2 API v2 in Step 1 for profile access
    - Sign into Google
    - In step 2, click 'Exchange authorization code for tokens'
    - Use the 'id_token' for sign in to our app

```
$ curl -X POST 
       -H "Content-Type: application/json" 
       -H "Accept: application/json" 
       -d
       '{
            "query": "query {
               signIn(tokenId: \"aj0sncnaksl9c112cjiop\")
            }"
       }'
       https://lrdd-server.herokuapp.com/graphql
```

- description: sign out an existing user
- request `POST https://lrdd-server.herokuapp.com/graphql`
    - credentials: include
    - content-type: `application/json`
    - accept: `application/json`
    - body: query
        ```
        query {
            signOut
        }
        ```
    - response: Valid credentials
        - body: Sign out successful
        ```
        {
            "data": {
                "signOut": "Sign out successful"
            }
        }
        ```
    - response: Unauthorized
        - body: unauthorized error
        ```
        {
            "errors": [
                {
                "message": "Unauthorized",
                "locations": [
                    {
                    "line": 50,
                    "column": 3
                    }
                ],
                "path": [
                    "signOut"
                ]
                }
            ],
            "data": {
                "signOut": null
            }
        }
        ```

```
$ curl -X POST 
       -H "Content-Type: application/json" 
       -H "Accept: application/json" 
       -d 
       '{
            "query": "query {
               signOut
            }"
       }' 
       https://lrdd-server.herokuapp.com/graphql
```

## Rooms API

### Query
- description: retrieve all rooms against a given filter
- request `POST https://lrdd-server.herokuapp.com/graphql`
    - credentials: include
    - content-type: `application/json`
    - accept: `application/json`
    - body: query
        - email: (String) user's email
        - filter: (String) filter for which rooms to return, defaulted to 'All'
        ```
        query {
            getRooms(input: {
                email: "anna@mail.utoronto.ca",
                filter: "Public"
            }) 
            {
                roomId,
                name,
                passProtected,
                owned
            }
        }
        ```
    - response: Valid credentials
        - body: list of room details
            - roomId: (String) id of of room
            - name: (String) name of room
            - passProtected: (Boolean) whether room is password protected
            - owned: (Boolean) whether room is owned by user requesting (based on email from body)
        ```
        {
            "data": {
                "getRooms": [
                    {
                        "roomId": "60725173ee62580020ce3b4e",
                        "name": "Anna's Room",
                        "passProtected": true,
                        "owned": true
                    }
                ]
            }
        }
        ```
    - response: Invalid credentials
        - body: invalid credentials error
        ```
        {
            "errors": [
                {
                "message": "Invalid credentials",
                "locations": [
                    {
                    "line": 32,
                    "column": 3
                    }
                ],
                "path": [
                    "getRooms"
                ]
                }
            ],
            "data": {
                "getRooms": null
            }
        }
        ```

```
$ curl -X POST 
       -H "Content-Type: application/json" 
       -H "Accept: application/json" 
       -d 
       '{
            "query": "query {
            getRooms(input: {
                    email: \"anna@mail.utoronto.ca\",
                    filter: \"Public\"
                }) 
                {
                    roomId,
                    name,
                    passProtected,
                    owned
                }
           }"
       }' 
       https://lrdd-server.herokuapp.com/graphql
```

- description: retrieve content for a given room
- request `POST https://lrdd-server.herokuapp.com/graphql`
    - credentials: include
    - content-type: `application/json`
    - accept: `application/json`
    - body: query
        - roomId: (String) id for a room
        ```
        query {
            getRoomContent(roomId: "60725173ee62580020ce3b4e") 
            {
                editorContent
                messages {
                    senderName
                    content
                }
            }
        }
        ```
    - response: Valid credentials
        - body: contents of a room
            - editorContent: (String) contents inside the editor
            - messages: (List) list of Message objects
                - senderName (String) name of message sender
                - content (String) contents of a message
        ```
        {
            "data": {
                "getRoomContent": {
                    "editorContent": "print('Hello World!')",
                    "messages": [
                        {
                            "senderName": "Anna",
                            "content": "Hello"
                        }
                    ]
                }
            }
        }
        ```
    - response: Invalid credentials
        - body: invalid credentials error
        ```
        {
            "errors": [
                {
                "message": "Invalid credentials",
                "locations": [
                    {
                    "line": 32,
                    "column": 5
                    }
                ],
                "path": [
                    "getRoomContent"
                ]
                }
            ],
            "data": {
                "getRoomContent": null
            }
        }
        ```

```
$ curl -X POST 
       -H "Content-Type: application/json" 
       -H "Accept: application/json" 
       -d 
       '{
            "query": "query {
            getRoomContent(roomId: \"60725173ee62580020ce3b4e\") 
                {
                    editorContent
                    messages {
                        senderName
                        content
                    }
                }
           }"
       }' 
       https://lrdd-server.herokuapp.com/graphql
```

- description: validate a user joining a room
- request `POST https://lrdd-server.herokuapp.com/graphql`
    - credentials: include
    - content-type: `application/json`
    - accept: `application/json`
    - body: query
        - roomId: (String) id for a rooom
        - pass: (String) password for a room, defaulted to an empty string
        ```
        query {
            joinRoom(
                roomId: "60725173ee62580020ce3b4e",
                pass: ""
            )
        }
        ```
    - response: Valid credentials
        - body: Authorized: Entering Room
        ```
        {
            "data": {
                "getRoomContent": 'Authorized: Entering Room'
            }
        }
        ```
    - response: Unauthorized
        - body: unauthorized error
        ```
        {
            "errors": [
                {
                "message": "Unauthorized",
                "locations": [
                    {
                    "line": 32,
                    "column": 5
                    }
                ],
                "path": [
                    "joinRoom"
                ]
                }
            ],
            "data": {
                "joinRoom": null
            }
        }
        ```

```
$ curl -X POST 
       -H "Content-Type: application/json" 
       -H "Accept: application/json" 
       -d 
       '{
            "query": "query {
                joinRoom(
                    roomId: \"60725173ee62580020ce3b4e\",
                    pass: \"\"
                )
            }"
       }' 
       https://lrdd-server.herokuapp.com/graphql
```

### Mutation

- description: create a new room
- request `POST https://lrdd-server.herokuapp.com/graphql`
    - credentials: include
    - content-type: `application/json`
    - accept: `application/json`
    - body: query
        - email: (String) user's email
        - name: (String) name of room
        - pass: (String) password for a room, defaulted to an empty string
        ```
        mutation {
            createRoom(input: {
                email: "anna@mail.utoronto.ca",
                name: "Anna's Room",
                pass: ""
            }) 
        }
        ```
    - response: Valid credentials
        - body: (String) id of new room
        ```
        {
            "data": {
                "createRoom": "60725173ee62580020ce3b4e"
            }
        }
        ```
    - response: Invalid credentials
        - body: invalid credentials error
        ```
        {
            "errors": [
                {
                "message": "Invalid credentials",
                "locations": [
                    {
                    "line": 32,
                    "column": 3
                    }
                ],
                "path": [
                    "createRoom"
                ]
                }
            ],
            "data": {
                "createRoom": null
            }
        }
        ```

```
$ curl -X POST 
       -H "Content-Type: application/json" 
       -H "Accept: application/json" 
       -d 
       '{
            "query": "mutation {
                createRoom(input: {
                    email: \"anna@mail.utoronto.ca\",
                    name: \"Anna's Room\",
                    pass: \"\"
                })
            }"
       }' 
       https://lrdd-server.herokuapp.com/graphql
```

- description: set the contents of a room
- request `POST https://lrdd-server.herokuapp.com/graphql`
    - credentials: include
    - content-type: `application/json`
    - accept: `application/json`
    - body: query
        - roomId: id of a room
        - editorContent: (String) contents inside the editor
        - messages: (List) list of Message objects
            - senderName (String) name of message sender
            - content (String) contents of a message
        ```
        mutation {
            setRoomContent(input: {
                roomId: "60725173ee62580020ce3b4e",
                editorContent: "print('Hello World!')",
                messages: [
                    {
                        senderName: "Anna",
                        content: "Hello"
                    }
                ]
            }) 
        }
        ```
    - response: Valid credentials
        - body: (Boolean) whether room content was successfully set
        ```
        {
            "data": {
                "setRoomContent": true
            }
        }
        ```
    - response: Invalid credentials
        - body: invalid credentials error
        ```
        {
            "errors": [
                {
                "message": "Invalid credentials",
                "locations": [
                    {
                    "line": 32,
                    "column": 3
                    }
                ],
                "path": [
                    "setRoomContent"
                ]
                }
            ],
            "data": {
                "setRoomContent": null
            }
        }
        ```

```
$ curl -X POST 
       -H "Content-Type: application/json" 
       -H "Accept: application/json" 
       -d 
       '{
            "query": "mutation {
                setRoomContent(input: {
                    roomId: \"60725173ee62580020ce3b4e\",
                    editorContent: \"print('Hello World!')\",
                    messages: [
                        {
                            senderName: \"Anna\",
                            content: \"Hello\"
                        }
                    ]
                }) 
            }"
       }' 
       https://lrdd-server.herokuapp.com/graphql
```

- description: delete an existing room
- request `POST https://lrdd-server.herokuapp.com/graphql`
    - credentials: include
    - content-type: `application/json`
    - accept: `application/json`
    - body: query
        - roomId: (String) id of a room
        ```
        mutation {
            deleteRoom(roomId: "60725173ee62580020ce3b4e")
        }
        ```
    - response: Valid credentials
        - body: (Boolean) whether room was deleted
        ```
        {
            "data": {
                "deleteRoom": true
            }
        }
        ```
    - response: Invalid credentials
        - body: invalid credentials error
        ```
        {
            "errors": [
                {
                "message": "Invalid credentials",
                "locations": [
                    {
                    "line": 32,
                    "column": 3
                    }
                ],
                "path": [
                    "deleteRoom"
                ]
                }
            ],
            "data": {
                "deleteRoom": null
            }
        }
        ```

```
$ curl -X POST 
       -H "Content-Type: application/json" 
       -H "Accept: application/json" 
       -d 
       '{
            "query": "mutation {
                deleteRoom(roomId: "60725173ee62580020ce3b4e")
            }"
       }' 
       https://lrdd-server.herokuapp.com/graphql
```

## Code Execution API

### Mutation

- description: run a given job
- request `POST https://lrdd-server.herokuapp.com/graphql`
    - credentials: include
    - content-type: `application/json`
    - accept: `application/json`
    - body: query
        - source_code: (String) encoded source code inside the editor
        - language: (Lang) a programming language
        ```
        enum Lang{
            PYTHON3
            JAVA
        }

        mutation {
            runJob(input: {
                source_code: "cHJpbnQoSGVsbG8gV29ybGQhKQ==",
                language: PYTHON3
            }) 
            {
                stdout,
                stderr
            }
        }
        ```
    - response: Valid credentials
        - body: Job object
            - stdout: (String) content printed to standard out
            - stderr: (String) content printed to standard error
        ```
        {
            "data": {
                "runJob":
                    {
                        "stdout": "Hello World!",
                        "stderr": ""
                    }
                ]
            }
        }
        ```
    - response: Invalid credentials
        - body: invalid credentials error
        ```
        {
            "errors": [
                {
                "message": "Invalid credentials",
                "locations": [
                    {
                    "line": 32,
                    "column": 3
                    }
                ],
                "path": [
                    "runJob"
                ]
                }
            ],
            "data": {
                "runJob": null
            }
        }
        ```

```
$ curl -X POST 
       -H "Content-Type: application/json" 
       -H "Accept: application/json" 
       -d 
       '{
            "query": "mutation {
                runJob(input: {
                    source_code: "cHJpbnQoSGVsbG8gV29ybGQhKQ==",
                    language: PYTHON3
                }) 
                {
                    stdout,
                    stderr
                }
            }"
       }' 
       https://lrdd-server.herokuapp.com/graphql
```
