import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container page narrow">
      <div className="empty">
        <h3>This page does not exist</h3>
        <p>The link may be broken, or the page may have moved.</p>
        <Link to="/" className="btn btn-primary">Go to home</Link>
      </div>
    </div>
  );
}
