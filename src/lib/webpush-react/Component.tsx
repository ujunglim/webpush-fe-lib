import { Button } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";
const LOCAL = "localhost";
// const LOCAL = "182.198.46.77"; // machost

export const Component = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [sendPushMessage, setSendPushMessage] = useState(
    '{"title": "테스트2", "body": "메세지 전송 테스트2"}'
  );
  const [pushId, setPushId] = useState<string>();

  useEffect(() => {
    const sessionPushId = sessionStorage.getItem("pushId");
    console.log("sessionPushId: ", sessionPushId);
    // pushId가 있으면 바로 sse연결
    if (sessionPushId) {
      setPushId(sessionPushId);
      handleSSEConnect();
    }
  }, []);

  const handleSSEConnect = async () => {
    try {
      const url = new URL(`http://${LOCAL}:10041/noti/sse`);
      if (pushId) {
        url.searchParams.append("pushId", pushId);
      }
      const mocktoken = "";
      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          Authorization: `Bearer ${localStorage.getItem("authorization")}`,
          // Authorization: `Bearer ${mocktoken}`, // machost
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      handleStreamData(response);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStreamData = async (response: any) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // 스트림 데이터를 비동기적으로 반복 읽기
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        console.log("Stream complete");
        break;
      }

      // 스트림 데이터를 디코딩 후 버퍼에 저장
      buffer += decoder.decode(value, { stream: true });
      // 데이터를 줄로 나누고, 완전하지 않은 마지막 줄은 다시 버퍼에 저장
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        // 유효한 데이터 추출
        if (line.startsWith("data:")) {
          const data = line.slice(5);
          handleRecievedData(data);
        }
      }
    }
  };

  const handleRecievedData = (data: string) => {
    console.log(data);
    // 첫 연결
    if (data.startsWith("Connected to")) {
      const newPushId: string = data.split(":")[1];
      setPushId(newPushId);
      sessionStorage.setItem("pushId", newPushId);
    } else {
      const pushId = sessionStorage.getItem("pushId");
      const parsedData = JSON.parse(data);
      if (parsedData.title && parsedData.body) {
        setMessages((prevMessages) => [
          ...prevMessages,
          `${pushId}: ${parsedData.body}`,
        ]);

        const notification = new Notification(parsedData.title, {
          body: `${parsedData.body} \npushID: ${pushId}`,
          icon: "../favicon.ico",
        });
        // 알람클릭 시 이동
        notification.addEventListener("click", () => {
          window.focus();
        });
      }
    }
  };

  const handleSendMessage = async () => {
    try {
      const res = await axios.post(`http://${LOCAL}:10041/noti/send`, {
        notificationType: "WEBPUSH",
        pushId,
        content: sendPushMessage,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <h1>Fetch SSE test </h1>
      <input
        type="text"
        value={sendPushMessage}
        style={{ width: "500px" }}
        onChange={(event) => setSendPushMessage(event.target.value)}
      />
      <br />
      <Button onClick={handleSSEConnect}>SSE connect</Button>
      <Button onClick={handleSendMessage}>Send Message</Button>
      <p>{`SSE 연결됨: ${pushId ? "O" : "X"}`}</p>
      <p>push Id: {pushId}</p>
      {messages.map((msg, i) => (
        <li key={i}>{msg}</li>
      ))}
    </div>
  );
};
