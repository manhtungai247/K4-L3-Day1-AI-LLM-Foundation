# K4 — Ngày 1: Bài Tập & Phản Ánh
## Khám Phá LLM API | Phiếu Thực Hành

**Thời lượng:** 4 tiếng
**Cách làm:** Trả lời từng câu ngay sau khi hoàn thành block tương ứng —
đừng để dồn hết về cuối buổi. Thay dòng `*Câu trả lời của bạn*` bằng câu
trả lời thật (chấm tự động sẽ đếm số câu đã trả lời).

---

## Block 1 — API Cơ Bản (trả lời sau Checkpoint 1)

### Câu 1.1 — Độ nhạy của temperature
Gọi `call_openai` với temperature 0.0, 0.5, 1.0 và 1.5 dùng prompt
**"Hãy kể cho tôi một sự thật thú vị về Việt Nam."**

**Bạn nhận thấy quy luật gì qua bốn phản hồi?** (2–3 câu)
> Khi tăng temperature từ 0.0 lên 1.5, phản hồi chuyển từ tính tất định, lặp lại và an toàn sang đa dạng, sáng tạo và khó đoán hơn. Ở 0.0, mô hình luôn chọn token có xác suất cao nhất và đưa ra cùng một sự thật quen thuộc (như vị thế xuất khẩu hạt tiêu hay cà phê); ở 0.5–1.0, nội dung trở nên phong phú hơn khi đề cập đến hang Sơn Đoòng hay sự đa dạng sinh học với câu văn tự nhiên, linh hoạt. Tuy nhiên, khi đẩy lên 1.5, tính ngẫu nhiên quá cao khiến câu từ bắt đầu thiếu mạch lạc, cấu trúc ngữ pháp lỏng lẻo và nguy cơ bịa đặt thông tin (hallucination) tăng vọt.

### Câu 1.2 — Chọn temperature cho sản phẩm
**Bạn sẽ đặt temperature bao nhiêu cho chatbot hỗ trợ khách hàng, và tại sao?**
> Đối với chatbot hỗ trợ khách hàng (CSKH), tôi sẽ đặt temperature ở mức thấp, khoảng từ 0.1 đến 0.3 (hoặc 0.0 đối với các luồng tra cứu trạng thái đơn hàng và điều khoản chính sách). Mức nhiệt độ này đảm bảo tính nhất quán, chính xác và có thể dự đoán được của các câu trả lời dựa trên kho tri thức/FAQ của doanh nghiệp. Đặt temperature thấp là biện pháp phòng vệ cốt lõi giúp hạn chế tối đa hiện tượng ảo giác (hallucination), ngăn chặn rủi ro mô hình tự sinh ra các thông tin chính sách, giá cả hoặc ưu đãi không có thực gây thiệt hại cho doanh nghiệp.

### Câu 1.3 — Đánh đổi chi phí
Kịch bản: 10.000 người dùng hoạt động mỗi ngày, mỗi người gọi API 3 lần,
mỗi lần trung bình ~350 token đầu ra.

**Ước tính GPT-4o đắt hơn GPT-4o-mini bao nhiêu lần cho workload này? Nêu một
trường hợp GPT-4o xứng đáng với chi phí và một trường hợp nên dùng mini:**
> Tổng lượng token output mỗi ngày cho workload này là: 10.000 × 3 × 350 = 10.500.000 token (10,5 triệu token). Theo bảng giá trong lab, đơn giá output của GPT-4o là 0.010 USD / 1K token còn GPT-4o-mini là 0.0006 USD / 1K token, do đó GPT-4o đắt hơn **16.67 lần** (với GPT-4o chi phí là 105 USD/ngày ~ 3.150 USD/tháng; với GPT-4o-mini chỉ tốn 6.30 USD/ngày ~ 189 USD/tháng, tiết kiệm gần 3.000 USD/tháng). GPT-4o hoàn toàn xứng đáng với chi phí khi cần giải quyết các bài toán suy luận logic phức tạp, phân tích chuyên sâu hợp đồng pháp lý nhiều trang hoặc trích xuất báo cáo tài chính nơi sai số nhỏ cũng dẫn đến rủi ro nghiêm trọng. Ngược lại, nên dùng GPT-4o-mini cho các tác vụ quy mô lớn, tần suất dày đặc nhưng yêu cầu nhận thức cơ bản như phân loại intent của tin nhắn, tóm tắt nội dung hội thoại ngắn hoặc giải đáp các câu hỏi FAQ định dạng sẵn.

---

## Block 2 — System Prompt & Token (trả lời sau Checkpoint 2)

### Câu 2.1 — Sức mạnh của persona
Gọi `chat_with_system_prompt` hai lần với cùng câu hỏi
**"Giải thích blockchain là gì?"** nhưng hai system prompt khác nhau:
- "Bạn là giáo viên tiểu học, giải thích thật đơn giản cho trẻ 8 tuổi."
- "Bạn là chuyên gia tài chính, trả lời chuyên sâu bằng thuật ngữ kỹ thuật."

**Hai phản hồi khác nhau như thế nào (độ dài, từ vựng, ví dụ)? System prompt
ảnh hưởng đến hành vi model ra sao?** (3–4 câu)
> Hai phản hồi có sự phân hóa cực kỳ sâu sắc về phong cách và đối tượng tiếp nhận. Với persona "giáo viên tiểu học", câu trả lời có độ dài vừa phải, sử dụng ngôn ngữ mộc mạc và xây dựng hình ảnh ẩn dụ trực quan dễ hiểu (ví dụ so sánh blockchain như một cuốn sổ ghi điểm chung của lớp học, nơi mỗi bạn đều giữ một bản sao và không ai có thể lén tẩy xóa điểm số). Ngược lại, persona "chuyên gia tài chính" tạo ra phản hồi dài hơn, cấu trúc học thuật nghiêm ngặt và sử dụng dày đặc các thuật ngữ chuyên ngành (như sổ cái phân tán DLT, thuật toán đồng thuận PoW/PoS, tính toàn vẹn mật mã học cryptographic immutability, mạng ngang hàng P2P và hợp đồng thông minh). Điều này cho thấy system prompt hoạt động như một "chỉ thị đạo diễn tối cao", điều hướng toàn bộ không gian từ vựng, mức độ trừu tượng nhận thức và giọng điệu của mô hình ngay cả khi câu hỏi của người dùng hoàn toàn không thay đổi.

### Câu 2.2 — tiktoken vs đếm từ
Chọn một đoạn văn tiếng Việt ~100 từ. So sánh số token theo `count_tokens`
(tiktoken) với ước lượng `số từ / 0.75` mà Part 1 đã dùng.

**Hai con số chênh nhau bao nhiêu phần trăm? Vì sao tiếng Việt thường tốn
nhiều token hơn tiếng Anh cùng độ dài?**
> Thử nghiệm với đoạn văn mẫu tiếng Việt gồm 111 từ (nói về ứng dụng công nghệ AI trong tối ưu vận hành và giáo dục): `count_tokens` sử dụng tiktoken (`o200k_base`) đếm được **131 token**, trong khi công thức ước lượng thô `111 / 0.75` cho ra khoảng **148 token**, chênh lệch khoảng **13.0%**. Tiếng Việt thường tốn nhiều token hơn tiếng Anh cùng độ dài ngữ nghĩa vì các thuật toán mã hóa Byte-Pair Encoding (BPE) của các LLM hiện đại được huấn luyện chủ yếu trên kho ngữ liệu khổng lồ bằng tiếng Anh, nơi hầu hết từ vựng tiếng Anh nguyên vẹn đã có sẵn token riêng; trong khi đó, tiếng Việt có hệ thống chữ cái latin mở rộng kết hợp dấu thanh và ký tự phụ phức tạp (như ă, â, đ, ê, ô, ơ, ư cùng 5 dấu thanh) nên rất nhiều từ không nằm trong từ điển cơ bản và bị phân rã thành nhiều subwords hoặc từng chuỗi byte UTF-8 riêng lẻ (khiến 1 từ tiếng Việt có thể tốn từ 2 đến 3 token).

---

## Block 3 — Streaming & Độ Bền (trả lời sau Checkpoint 3)

### Câu 3.1 — Trải nghiệm người dùng với streaming
**Streaming quan trọng nhất trong trường hợp nào, và khi nào thì
non-streaming lại phù hợp hơn?** (1 đoạn văn)
> Streaming đóng vai trò sống còn trong các ứng dụng có giao diện tương tác trực tiếp với người dùng như chatbot trò chuyện, trợ lý dòng lệnh tương tác hoặc hệ thống hỗ trợ viết văn bản; bởi vì streaming tối ưu hóa triệt để chỉ số Time-To-First-Token (TTFT), giúp người dùng nhìn thấy từng chữ xuất hiện ngay tức thì (sau vài trăm mili-giây) thay vì phải chịu đựng cảm giác ứng dụng bị đơ, treo suốt 5–10 giây khi mô hình sinh ra cả đoạn phản hồi dài. Mặt khác, non-streaming lại là lựa chọn tối ưu hơn trong các tác vụ ngầm ở backend (background job), xử lý dữ liệu hàng loạt (batch pipelines), hoặc các trường hợp gọi Function/Tool Calling yêu cầu sinh dữ liệu có cấu trúc nghiêm ngặt (như JSON, XML, code) nơi chương trình phải nhận trọn vẹn 100% nội dung để tiến hành parse, kiểm tra cú pháp và validate tính hợp lệ trước khi sử dụng.

### Câu 3.2 — Vì sao backoff theo cấp số nhân?
**So với delay cố định (ví dụ luôn chờ 1 giây), exponential backoff có lợi
thế gì khi API bị quá tải? Điều gì xảy ra nếu hàng nghìn client cùng retry
với delay cố định giống nhau?**
> So với delay cố định, exponential backoff (thời gian chờ tăng theo hàm mũ: 0.1s, 0.2s, 0.4s, 0.8s...) mang lại lợi thế cốt lõi là giãn rộng mật độ request theo thời gian, tạo ra một "khoảng thở" ngày càng lớn để máy chủ API đang quá tải có đủ tài nguyên dọn dẹp hàng đợi và tự phục hồi sau sự cố. Nếu hàng nghìn client cùng cấu hình một mức delay cố định (ví dụ luôn chờ đúng 1 giây), toàn bộ các client này sẽ đồng loạt gửi lại request vào cùng một thời điểm sau 1 giây, tạo nên hiện tượng giông bão tải (Thundering Herd Problem); các đợt sóng xung kích tập trung này sẽ liên tục tấn công dồn dập vào hạ tầng vốn đã suy yếu, khiến máy chủ bị tê liệt hoàn toàn và dẫn đến sụp đổ dây chuyền (cascading failure).

---

## Block 4 — Mini-Project (trả lời sau Checkpoint 4)

### Câu 4.1 — Thiết kế persona
**Bạn chọn persona gì cho trợ lý của mình? Viết lại system prompt đó và giải
thích 1–2 lựa chọn từ ngữ quan trọng trong prompt (ví dụ: vì sao yêu cầu
"trả lời ngắn gọn", vì sao chỉ định ngôn ngữ...):**
> Tôi chọn persona: **Trợ giảng AI thực hành tận tâm, chuyên hỗ trợ gỡ lỗi và giải thích khái niệm cho học viên lập trình**. System prompt cụ thể: *"Bạn là trợ giảng AI thân thiện của khóa học lập trình, luôn giao tiếp bằng tiếng Việt gần gũi, trả lời ngắn gọn súc tích (dưới 100 từ) và luôn kèm theo ví dụ code Python tối giản, dễ hiểu khi giải thích kỹ thuật."* Trong system prompt này, có hai lựa chọn từ ngữ then chốt: (1) Cụm từ **"trả lời ngắn gọn súc tích (dưới 100 từ)"** đóng vai trò thiết yếu giúp tối ưu chi phí token, giảm độ trễ hiển thị trong môi trường dòng lệnh (CLI) và giữ cho người học tập trung vào giải pháp trọng tâm thay vì bị ngợp bởi thông tin dài dòng; (2) Việc chỉ định rõ ràng **"giao tiếp bằng tiếng Việt gần gũi"** loại bỏ rào cản tâm lý của người mới học lập trình, tạo cảm giác an tâm và thúc đẩy việc tương tác, đặt câu hỏi tự nhiên hơn.

### Câu 4.2 — Hạn chế & cải thiện
**Trợ lý của bạn hiện có hạn chế lớn nhất là gì (ví dụ: history chỉ 3 lượt,
không có bộ nhớ dài hạn, không kiểm duyệt nội dung...)? Đề xuất một cải
thiện cụ thể và mô tả ngắn cách triển khai:**
> Hạn chế lớn nhất của trợ lý hiện tại là cơ chế cắt history cục bộ (sliding window chỉ giữ 3 lượt hỏi-đáp gần nhất, tức 6 message): khi cuộc trao đổi kéo dài hơn 3 lượt, trợ lý sẽ mất sạch toàn bộ ngữ cảnh nền tảng ban đầu (như bài toán người dùng đang làm, cấu hình môi trường hay biến số đã thống nhất). Để khắc phục, cải thiện cụ thể và hiệu quả nhất là áp dụng kỹ thuật **Tóm tắt ngữ cảnh hội thoại tự động (Conversation Summarization Memory)**. Cách triển khai: thiết lập một ngưỡng (ví dụ khi history đạt 4 lượt), hệ thống sẽ kích hoạt một lời gọi ngầm sử dụng model nhỏ, chi phí rẻ (như GPT-4o-mini) với prompt yêu cầu tóm tắt cô đọng các thông tin và quyết định quan trọng của các lượt cũ thành 2–3 câu; sau đó, lưu bản tóm tắt này vào một message ngữ cảnh đặc biệt gắn kèm `system prompt`, đồng thời reset danh sách history của cửa sổ trượt. Bằng cách này, trợ lý vẫn ghi nhớ được mạch thông tin dài hạn xuyên suốt phiên làm việc mà không làm phình to chi phí token ở mỗi lượt gọi.

---

## Danh Sách Kiểm Tra Nộp Bài

- [x] `python grade.py` — xem điểm tự động, mục tiêu ≥ 75/100
- [x] Cả 4 checkpoint pytest đều pass
- [x] Tất cả 9 câu trong file này đã được trả lời
- [x] Đã copy bài làm vào folder `solution/`, push lên fork và dán link trên trang bài Lab ở VLearn trước 23:59 ngày 11/09/2026
