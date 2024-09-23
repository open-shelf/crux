import React, { useEffect, useState } from "react";
import { useProgram } from "../contexts/ProgramContext";

function BookList() {
  const [books, setBooks] = useState([]);
  const { program } = useProgram();

  useEffect(() => {
    // Fetch books from the program
  }, [program]);

  return (
    <div className="book-list">
      <h2>Books</h2>
      {books.map((book) => (
        <div key={book.publicKey.toString()}>
          <h3>{book.account.title}</h3>
          <p>Author: {book.account.author.toString()}</p>
          <p>Chapters: {book.account.chapterCount.toString()}</p>
        </div>
      ))}
    </div>
  );
}

export default BookList;
