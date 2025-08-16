import tensorflow as tf
import numpy as np
import os

# ===== Configuration =====
VOCAB = ["<PAD>", "<SOS>", "<EOS>", "<UNK>"] + [chr(i) for i in range(97, 123)]
CHAR2IDX = {c: i for i, c in enumerate(VOCAB)}
IDX2CHAR = {i: c for c, i in CHAR2IDX.items()}

VOCAB_SIZE = len(VOCAB)
MAX_LEN = 32
EMBEDDING_DIM = 64
HIDDEN_UNITS = 128
BATCH_SIZE = 16
CHECKPOINT_PATH = "chatbot_checkpoint"

# ===== Tokenizer =====
def tokenize(text, max_len=MAX_LEN):
    tokens = [CHAR2IDX.get(c, CHAR2IDX["<UNK>"]) for c in text.lower()[:max_len]]
    tokens = [CHAR2IDX["<SOS>"]] + tokens + [CHAR2IDX["<EOS>"]]
    tokens += [CHAR2IDX["<PAD>"]] * (max_len + 2 - len(tokens))  # +2 for SOS and EOS
    return tokens[:max_len + 2]

def detokenize(tokens):
    return "".join(IDX2CHAR.get(i, "?") for i in tokens if i not in {CHAR2IDX["<PAD>"], CHAR2IDX["<SOS>"], CHAR2IDX["<EOS>"]})

# ===== Sample Training Data =====
PROMPTS = ["hello", "hi", "who are you", "what is your name", "bye", "goodbye"]
REPLIES = ["hi", "hello", "i am a chatbot", "i am bot", "see you", "bye"]
DATA = [(tokenize(p), tokenize(r)) for p, r in zip(PROMPTS, REPLIES)]

# ===== Attention Layer =====
class BahdanauAttention(tf.keras.layers.Layer):
    def __init__(self, units):
        super().__init__()
        self.W1 = tf.keras.layers.Dense(units)
        self.W2 = tf.keras.layers.Dense(units)
        self.V = tf.keras.layers.Dense(1)

    def call(self, query, values):
        query_with_time_axis = tf.expand_dims(query, 1)
        score = self.V(tf.nn.tanh(self.W1(query_with_time_axis) + self.W2(values)))
        attention_weights = tf.nn.softmax(score, axis=1)
        context_vector = attention_weights * values
        context_vector = tf.reduce_sum(context_vector, axis=1)
        return context_vector, attention_weights

# ===== Model Definition =====
class Seq2Seq(tf.keras.Model):
    def __init__(self, vocab_size, embed_dim, hidden_units):
        super().__init__()
        self.embedding = tf.keras.layers.Embedding(vocab_size, embed_dim, mask_zero=True)
        self.encoder = tf.keras.layers.GRU(hidden_units, return_sequences=True, return_state=True)
        self.decoder = tf.keras.layers.GRU(hidden_units, return_sequences=True, return_state=True)
        self.attention = BahdanauAttention(hidden_units)
        self.concat = tf.keras.layers.Concatenate()
        self.dense = tf.keras.layers.Dense(vocab_size)

    def call(self, enc_input, dec_input, training=False):
        enc_embed = self.embedding(enc_input)
        enc_output, enc_state = self.encoder(enc_embed)

        dec_embed = self.embedding(dec_input)
        dec_seq_len = tf.shape(dec_input)[1]
        dec_contexts = []
        dec_state = enc_state

        for t in range(dec_seq_len):
            x = dec_embed[:, t:t+1, :]
            context_vector, _ = self.attention(dec_state, enc_output)
            context_vector = tf.expand_dims(context_vector, 1)
            x = self.concat([context_vector, x])
            output, dec_state = self.decoder(x, initial_state=dec_state)
            dec_contexts.append(output)

        dec_output = tf.concat(dec_contexts, axis=1)
        return self.dense(dec_output)

model = Seq2Seq(VOCAB_SIZE, EMBEDDING_DIM, HIDDEN_UNITS)
loss_fn = tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True)
optimizer = tf.keras.optimizers.Adam()

# ===== Checkpointing =====
ckpt = tf.train.Checkpoint(model=model, optimizer=optimizer)
ckpt_manager = tf.train.CheckpointManager(ckpt, CHECKPOINT_PATH, max_to_keep=3)

if ckpt_manager.latest_checkpoint:
    ckpt.restore(ckpt_manager.latest_checkpoint)
    print(f"🔄 Restored model from {ckpt_manager.latest_checkpoint}")

# ===== Dataset Preparation =====
def create_dataset(data, batch_size):
    inputs = [x for x, _ in data]
    targets = [y for _, y in data]
    dec_inputs = [[CHAR2IDX["<SOS>"]] + y[:-1] for y in targets]
    dataset = tf.data.Dataset.from_tensor_slices((inputs, dec_inputs, targets))
    return dataset.shuffle(len(data)).batch(batch_size)

# ===== Training Step =====
@tf.function
def train_step(enc_input, dec_input, dec_target):
    with tf.GradientTape() as tape:
        logits = model(enc_input, dec_input, training=True)
        loss = loss_fn(dec_target, logits)
    grads = tape.gradient(loss, model.trainable_variables)
    optimizer.apply_gradients(zip(grads, model.trainable_variables))
    return loss

# ===== Training Loop =====
def train(data, epochs=50):
    dataset = create_dataset(data, BATCH_SIZE)
    print("🧠 Training started")
    for epoch in range(1, epochs + 1):
        total_loss = 0
        for batch in dataset:
            enc_input, dec_input, dec_target = batch
            loss = train_step(enc_input, dec_input, dec_target)
            total_loss += loss.numpy()
        if epoch % 10 == 0 or epoch == 1:
            avg_loss = total_loss / len(dataset)
            print(f"Epoch {epoch}, Loss: {avg_loss:.4f}")
    ckpt_manager.save()
    print("✅ Training complete & model saved\n")

# ===== Inference (Beam Search) =====
def chat(prompt, beam_width=3):
    tokens = tokenize(prompt)
    enc_input = tf.constant([tokens])
    enc_embed = model.embedding(enc_input)
    enc_output, enc_state = model.encoder(enc_embed)

    sequences = [[[], CHAR2IDX["<SOS>"], enc_state, 0.0]]  # [output_tokens, last_token, state, score]

    for _ in range(MAX_LEN):
        all_candidates = []
        for seq, last_token, state, score in sequences:
            dec_input = tf.constant([[last_token]])
            dec_embed = model.embedding(dec_input)
            context_vector, _ = model.attention(state, enc_output)
            context_vector = tf.expand_dims(context_vector, 1)
            x = model.concat([context_vector, dec_embed])
            dec_output, dec_state = model.decoder(x, initial_state=state)
            logits = model.dense(dec_output)
            logits = tf.squeeze(logits, axis=1)
            probs = tf.nn.log_softmax(logits)

            top_k = tf.math.top_k(probs, k=beam_width)
            for i in range(beam_width):
                token = int(top_k.indices[0][i])
                candidate = seq + [token]
                candidate_score = score + float(top_k.values[0][i])
                if token == CHAR2IDX["<EOS>"]:
                    return detokenize(candidate)
                all_candidates.append([candidate, token, dec_state, candidate_score])

        sequences = sorted(all_candidates, key=lambda tup: tup[3], reverse=True)[:beam_width]

    return detokenize(sequences[0][0])

# ===== Continual Learning =====
def continual_learning(prompt, user_feedback):
    reply = chat(prompt)
    print(f"🤖 Bot: {reply}")
    if user_feedback > 0:
        print("👍 Positive feedback: reinforcing")
        DATA.append((tokenize(prompt), tokenize(reply)))
        recent_data = DATA[-BATCH_SIZE:] if len(DATA) >= BATCH_SIZE else DATA
        train(recent_data, epochs=10)
    elif user_feedback < 0:
        print("👎 Negative feedback: ignoring")
    return reply
