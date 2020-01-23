## About Comment

  <_댓글 조회, 생성, 수정, 삭제_>
  * **전제:**
  로그인 후 쿠키 정보를 이용한 인증 필요

* **API call:**<br>
  http://localhost:8000/comment<br>
  http://54.180.118.35/comment

* **Sample JSON data:**
  ```json
  {
      "success": true,
      "data": [
          {
              "id": 3,
              "comment_content": "3333-111",
              "confirm": false,
              "createdAt": "2019-12-31T07:07:06.000Z",
              "updatedAt": "2019-12-31T07:07:06.000Z",
              "deletedAt": null,
              "fk_user_uid": "$2b$12$RCxSlT27FkieRFlulGF1uuE64BzKWVcF9r/SrssGRoD.wr8wjqrk6",
              "fk_board_id": 3,
              "user": {
                  "nickname": "marge_222",
                  "portrait": "1576479564662round_logo_512px_dark.png"
              }
          },
          {
              "id": 4,
              "comment_content": "3333-222",
              "confirm": false,
              "createdAt": "2019-12-31T07:07:24.000Z",
              "updatedAt": "2019-12-31T07:07:24.000Z",
              "deletedAt": null,
              "fk_user_uid": "$2b$12$RCxSlT27FkieRFlulGF1uuE64BzKWVcF9r/SrssGRoD.wr8wjqrk6",
              "fk_board_id": 3,
              "user": {
                  "nickname": "marge_222",
                  "portrait": "1576479564662round_logo_512px_dark.png"
              }
          }
      ],
      "message": "해당 게시물의 전체 댓글 조회 성공"
  }
  ```
  * `success=[boolean]` 요청 성공 여부 null[x]
  * `data=[string]` 요청한 정보 null[o]
    - `id=[integer]` 댓글 번호, 고유값, null[x]
    - `comment_content=[string]` 댓글 내용(이름), null[x]
    - `createdAt=[date]` 생성일, null[x]
    - `updatedAt=[date]` 수정일, null[x]
    - `deletedAt=[date]` 삭제일, null[o]
    - `fk_user_uid=[string]` 댓글 작성자 user_uid, null[x]
    - `fk_board_id=[date]` 해당 댓글이 달린 게시물 id, null[x]
    - `user=[user]` 댓글 작성자 프로필 정보, null[x]
        - `nickname=[string]` 댓글 작성자 닉네임 정보, null[x]
        - `portrait=[string]` 댓글 작성자 프로필사진 정보, null[o]
  * `message=[string]` 요청 성공 혹은 실패에 대한 세부 내용, null[x]
  <!--회원정보 JSON 형태 + 변수 설명 -->


----

**Create Comment**
----
게시물에 댓글 생성.
Create a comment to a single post.

* **URL**

  http://54.180.118.35/comment/create

* **Method:**

  `POST`
  
*  **URL Params**

   **Required:**
 
   None

* **Data Params**

    **Required:**
    
    * `board_id=[integer]` 게시물 번호(ID)
    * `comment_content=[string]` 댓글 내용

    <!--필요한 form field 명시 + 설명-->


* **Success Response:**

  * **Code:** 201 
    **Content:** 사용자 정보 및 사용자가 생성한 댓글 객체 반환<br/>

    * **Sample request JSON data:**
    ```json
    {
        "success": true,
        "data": {
            "user": {
                "user_uid": "sdfgh^&^$%@@#qrwgsh@%%uiukjhht%&iujhgfe%y&iuyhgfd",
                "email": "test@naver.com",
                "nickname": "test",
                "portrait": "",
                "introduction": ""
            },
            "comment": {
                "confirm": false,
                "id": 40,
                "fk_board_id": 10,
                "fk_user_uid": "sdfgh^&^$%@@#qrwgsh@%%uiukjhht%&iujhgfe%y&iuyhgfdq",
                "comment_content": "content",
                "updatedAt": "2020-01-01T09:12:20.178Z",
                "createdAt": "2020-01-01T09:12:20.178Z"
            }
        },
        "message": "[201 CREATED] 댓글 생성 완료"
    }
    ```

* **Error Response:**

  * **Code:** 403 FORBIDDEN : 댓글 내용(comment_content)값이 비어있을 때 <br />
    **Content:** 
     ```json
    {
        "success": false,
        "data": "NONE",
        "message": "[403 FORBIDDEN] 댓글 생성 실패: 댓글 내용(comment_content)는 반드시 입력해야 합니다."
    }
    ```

  * **Code:** 401 UNAUTHORIZED : 게시물 작성자 혹은 조언자가 아닌 사람이 댓글 작성 시도할 때(권한 없음) <br />
    **Content:** 
     ```json
    {
        "success": false,
        "data": "",
        "message": "[401 UNAUTHORIZED] 댓글 작성 실패: 게시물 주인 및 조언자만 댓글을 작성할 수 있습니다."
    }
    ```

  * **Code:** 404 NOT FOUND : 존재하지 않는 게시물에 댓글 작성 시도할 때 <br />
    **Content:** 
     ```json
    {
        "success": false,
        "data": "",
        "message": "[404 NOT FOUND] 댓글 작성 실패: 존재하지 않는 게시물입니다."
    }
    ```



---
**Show all comments of a single post**
----
게시물 하나의 모든 댓글 보기. 댓글 객체 정보 + user의 nickname, portrait 정보 반환함. data 안 user 속성으로 접근할 수 있음.
Show all comments of a single post. Return full data of the comments and user's nickname, portrait.

* **URL**

  http://54.180.118.35/comment/selectall/:board_id

* **Method:**

  `GET`
  
*  **URL Params**

   **Required:**
   * `board_id=[integer]` 게시물 번호(ID)
 
   None

* **Data Params**

    **Required:**

    <!--필요한 form field 명시 + 설명-->


* **Success Response:**

  * **Code:** 200
    **Content:** 해당 게시물의 모든 댓글 불러오기<br/>

    * **Sample request JSON data:**
    ```json
    {
        "success": true,
        "data": [
            {
                "id": 3,
                "comment_content": "3333-111",
                "confirm": false,
                "createdAt": "2019-12-31T07:07:06.000Z",
                "updatedAt": "2019-12-31T07:07:06.000Z",
                "deletedAt": null,
                "fk_user_uid": "$2b$12$RCxSlT27FkieRFlulGF1uuE64BzKWVcF9r/SrssGRoD.wr8wjqrk6",
                "fk_board_id": 3,
                "user": {
                    "nickname": "marge_222",
                    "portrait": "1576479564662round_logo_512px_dark.png"
                }
            },
            {
                "id": 4,
                "comment_content": "3333-222",
                "confirm": false,
                "createdAt": "2019-12-31T07:07:24.000Z",
                "updatedAt": "2019-12-31T07:07:24.000Z",
                "deletedAt": null,
                "fk_user_uid": "$2b$12$RCxSlT27FkieRFlulGF1uuE64BzKWVcF9r/SrssGRoD.wr8wjqrk6",
                "fk_board_id": 3,
                "user": {
                    "nickname": "marge_222",
                    "portrait": "1576479564662round_logo_512px_dark.png"
                }
            },
            {
                "id": 5,
                "comment_content": "3333-333",
                "confirm": false,
                "createdAt": "2019-12-31T07:07:28.000Z",
                "updatedAt": "2019-12-31T07:07:28.000Z",
                "deletedAt": null,
                "fk_user_uid": "$2b$12$RCxSlT27FkieRFlulGF1uuE64BzKWVcF9r/SrssGRoD.wr8wjqrk6",
                "fk_board_id": 3,
                "user": {
                    "nickname": "marge_222",
                    "portrait": "1576479564662round_logo_512px_dark.png"
                }
            }
        ],
        "message": "[200 OK] 해당 게시물의 전체 댓글 조회 성공"
    }
    ```

  * **Code:** 200
    **Content:** 조회 요청했으나 댓글이 하나도 없을 때<br/>

    * **Sample request JSON data:**
    ```json
        {
            "success": true,
            "data": "",
            "message": "[200 OK] 해당 게시물에 댓글이 없습니다."
        }
    ```

* **Error Response:**
  * **Code:** 404 NOT FOUND : 존재하지 않는 게시물의 댓글들을 조회하려고 할 때<br/>
    **Content:** 
     ```json
    {
        "success": false,
        "data": "",
        "message": "[404 NOT FOUND] 존재하지 않는 게시물의 댓글은 조회할 수 없습니다."
    }
    ```


---
**Show one comment.**
----
조회 요청한 댓글 객체를 json 형태로 반환.
Return full data of a single comment and user(commenter)'s nickname, portrait.

* **URL**

  http://54.180.118.35/comment/selectone/:comment_id

* **Method:**

  `GET`
  
*  **URL Params**

   **Required:**
   * `comment_id=[integer]` 댓글 번호(ID)
 
   None

* **Data Params**

    **Required:**
    None

    <!--필요한 form field 명시 + 설명-->


* **Success Response:**

  * **Code:** 200
    **Content:** 조회 요청한 댓글 객체 반환<br/>
    **Sample request JSON data:**
    ```json
        {
            "success": true,
            "data": {
                "id": 5,
                "comment_content": "3333-333",
                "confirm": false,
                "createdAt": "2019-12-31T07:07:28.000Z",
                "updatedAt": "2019-12-31T07:07:28.000Z",
                "deletedAt": null,
                "fk_user_uid": "$2b$12$RCxSlT27FkieRFlulGF1uuE64BzKWVcF9r/SrssGRoD.wr8wjqrk6",
                "fk_board_id": 3,
                "user": {
                    "nickname": "marge_222",
                    "portrait": "1576479564662round_logo_512px_dark.png"
                }
            },
            "message": "[200 OK] 댓글 조회 성공"
        }
    ```

* **Error Response:**
  * **Code:** 404 NOT FOUND : 존재하지 않는 댓글을 조회하려고 할 때<br/>
    **Content:** 
     ```json
    {
        "success": false,
        "data": "",
        "message": "[404 NOT FOUND] 댓글 조회 실패: 존재하지 않는 댓글입니다."
    }
    ```


---
**Modify one comment**
----
본인이 작성한 댓글 한 개의 내용 수정하여 수정된 댓글 객체 반환.
Update a single comment of the loggedin user and return the modified comment in json format.

* **URL**

  http://54.180.118.35/comment/update/:comment_id

* **Method:**

  `PUT`
  
*  **URL Params**

   **Required:**
   * `comment_id=[integer]` 댓글 번호(ID)
 

* **Data Params**

    **Required:**
     * `comment_content=[String]` 댓글 내용

    <!--필요한 form field 명시 + 설명-->


* **Success Response:**

  * **Code:** 200
    **Content:** 수정된 댓글 객체 반환<br>
    * **Sample request JSON data:**
    ```json
        {
            "success": true,
            "data": {
                "id": 7,
                "comment_content": "edit_homer",
                "confirm": false,
                "createdAt": "2020-01-01T06:14:46.000Z",
                "updatedAt": "2020-01-01T06:16:34.262Z",
                "deletedAt": null,
                "fk_user_uid": "$2b$12$lUfAwWAZ73QNVqM7w3Iy.O//l3Mas0l7WEtsBJp3yuAqv2kitOeSS",
                "fk_board_id": 3
            },
            "message": "[200 OK] 댓글 수정 성공"
        }
    ```

* **Error Response:**

  * **Code:** 403 FORBIDDEN : 댓글 내용(comment_content)값이 비어있을 때 <br />
    **Content:** 
     ```json
    {
        "success": false,
        "data": "NONE",
        "message": "[403 FORBIDDEN] 댓글 수정 실패: 댓글 내용(comment_content)는 반드시 입력해야 합니다."
    }
    ```

  * **Code:** 401 UNAUTHORIZED : 본인의 댓글이 아닌 것을 수정하려고 할 때 <br />
    **Content:** 
     ```json
    {
        "success": false,
        "data": "NONE",
        "message": "[401 UNAUTHORIZED] 댓글 수정 실패: 본인의 댓글만 수정할 수 있습니다."
    }
    ```

  * **Code:** 404 NOT FOUND : 존재하지 않는 댓글을 수정하려고 할 때 <br />
    **Content:** 
     ```json
    {
        "success": false,
        "data": "NONE",
        "message": "[404 NOT FOUND] 댓글 수정 실패: 존재하지 않는 댓글입니다."
    }
    ```


---
**Delete one comment.**
----
본인이 작성한 댓글 하나를 삭제하고 삭제된 댓글 번호 및 성공 메시지 반환.
Delete a single comment of the loggedin user and return the deleted comment_id and success message.

* **URL**

  http://54.180.118.35/comment/delete/:comment_id

* **Method:**

  `DELETE`
  
*  **URL Params**

   **Required:**
   * `comment_id=[integer]` 댓글 번호(ID)
 
   None

* **Data Params**

    **Required:**
    None

    <!--필요한 form field 명시 + 설명-->


* **Success Response:**

  * **Code:** 200
    **Content:** 삭제된 댓글 번호, 해당 댓글이 포함된 게시물 번호 및 성공 메시지 반환<br>
    * **Sample request JSON data:**
    ```json
        {
            "success": true,
            "data": {
                "board_id": 4,
                "comment_id": "5"
            },
            "message": "[200 OK] 댓글 삭제 성공"
        }
    ```

* **Error Response:**

  * **Code:** 401 UNAUTHORIZED : 본인의 댓글이 아닌 것을 삭제하려고 할 때 <br />
    **Content:** 
     ```json
    {
        "success": false,
        "data": "NONE",
        "message": "[401 UNAUTHORIZED] 댓글 삭제 실패: 본인의 댓글만 삭제할 수 있습니다."
    }
    ```

  * **Code:** 404 NOT FOUND : 존재하지 않는 댓글을 삭제하려고 할 때 <br />
    **Content:** 
     ```json
    {
        "success": false,
        "data": "NONE",
        "message": "[404 NOT FOUND] 댓글 삭제 실패: 존재하지 않는 댓글입니다."
    }
    ```
