import React, { useState } from "react";
import { useProgram } from "../contexts/ProgramContext";

function BookForm() {
  const [title, setTitle] = useState("");
  const { program } = useProgram();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Implement book creation logic here
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Book Title"
        required
      />
      <button type="submit">Create Book</button>
    </form>
  );
}

export default BookForm;
