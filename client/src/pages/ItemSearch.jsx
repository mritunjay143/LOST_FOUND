import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";

const CATEGORIES = [
  "ALL",
  "Electronics",
  "Mobile",
  "Laptop",
  "Wallet",
  "ID Card",
  "Books",
  "Documents",
  "Keys",
  "Bag",
  "Clothing",
  "Accessories",
  "Other",
];

function ItemSearch() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [type, setType] = useState(searchParams.get("type") || "ALL");
  const [category, setCategory] = useState(searchParams.get("category") || "ALL");
  const [status, setStatus] = useState(searchParams.get("status") || "ALL");
  const [color, setColor] = useState(searchParams.get("color") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError("");

      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (type !== "ALL") queryParams.set("type", type);
      if (category !== "ALL") queryParams.set("category", category);
      if (status !== "ALL") queryParams.set("status", status);
      if (color) queryParams.set("color", color);
      if (location) queryParams.set("location", location);
      if (sort) queryParams.set("sort", sort);
      queryParams.set("page", page);
      queryParams.set("limit", 12);

      const response = await api.get(`/items?${queryParams.toString()}`);
      setItems(response.data.items || []);
      setPagination(response.data.pagination || { total: 0, pages: 1 });
    } catch (err) {
      console.error("Search fetch error:", err);
      setError("Failed to fetch items matching your search criteria.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search, type, category, status, color, location, sort, page]);

  const handleResetFilters = () => {
    setSearch("");
    setType("ALL");
    setCategory("ALL");
    setStatus("ALL");
    setColor("");
    setLocation("");
    setSort("newest");
    setPage(1);
  };

  return (
    <div className="search-page-container">
      <div className="search-header-banner">
        <h2>🔎 Search & Filter Campus Items</h2>
        <p>Explore all reported lost and found items across campus departments and facilities.</p>
      </div>

      <div className="search-layout">
        {/* Sidebar Filters */}
        <aside className="filter-sidebar">
          <div className="sidebar-header">
            <h3>Filters</h3>
            <button onClick={handleResetFilters} className="btn-reset-filters">
              Reset All
            </button>
          </div>

          <div className="filter-group">
            <label>Report Type</label>
            <div className="filter-radio-group">
              {["ALL", "LOST", "FOUND"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip-btn ${type === t ? "active" : ""}`}
                  onClick={() => {
                    setType(t);
                    setPage(1);
                  }}
                >
                  {t === "ALL" ? "All" : t === "LOST" ? "🔴 Lost" : "🟢 Found"}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select
              className="form-input"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              className="form-input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="MATCHED">MATCHED</option>
              <option value="CLAIMED">CLAIMED</option>
              <option value="RETURNED">RETURNED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Location Contains</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Library, Lab, Canteen"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="filter-group">
            <label>Color</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Black, Silver, Blue"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </aside>

        {/* Search Content Body */}
        <main className="search-main-content">
          <div className="search-bar-row">
            <div className="input-wrapper search-input-wrapper">
              <span className="input-icon">🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="Search items by keywords, title, description, brand..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="sort-wrapper">
              <label>Sort By:</label>
              <select
                className="form-input sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="recently_updated">Recently Updated</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="results-count-bar">
            <span>
              Showing {items.length} of <strong>{pagination.total}</strong> results
            </span>
          </div>

          {loading ? (
            <div className="loading-box">
              <div className="spinner"></div>
              <span>Searching items database...</span>
            </div>
          ) : error ? (
            <div className="alert-banner error">{error}</div>
          ) : items.length === 0 ? (
            <div className="empty-state-box">
              <span className="empty-icon">🔍</span>
              <h3>No items found</h3>
              <p>Try adjusting your search keywords, clearing filters, or checking back later.</p>
              <button onClick={handleResetFilters} className="btn-hero-secondary" style={{ marginTop: "12px" }}>
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="items-grid">
                {items.map((item) => (
                  <div key={item._id} className="item-card">
                    <div className="item-card-header">
                      <span className={`badge-type ${item.type.toLowerCase()}`}>
                        {item.type === "LOST" ? "🔴 LOST" : "🟢 FOUND"}
                      </span>
                      <span className={`badge-status ${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </div>

                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="item-card-image"
                      />
                    ) : (
                      <div className="item-image-placeholder">
                        <span>📷 No Image</span>
                      </div>
                    )}

                    <div className="item-card-body">
                      <h3 className="item-title">{item.title}</h3>
                      <p className="item-description">
                        {item.description.length > 80
                          ? `${item.description.substring(0, 80)}...`
                          : item.description}
                      </p>

                      <div className="item-meta">
                        <span>📂 {item.category}</span>
                        <span>📍 {item.location}</span>
                        {item.color && <span>🎨 {item.color}</span>}
                        {item.brand && <span>🏷️ {item.brand}</span>}
                        <span>📅 {new Date(item.date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="item-card-footer">
                      <Link to={`/items/${item._id}`} className="btn-view-details">
                        View Details & Contact
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination.pages > 1 && (
                <div className="pagination-bar">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="pagination-btn"
                  >
                    ◀ Previous
                  </button>

                  <span className="pagination-info">
                    Page {page} of {pagination.pages}
                  </span>

                  <button
                    disabled={page >= pagination.pages}
                    onClick={() => setPage(page + 1)}
                    className="pagination-btn"
                  >
                    Next ▶
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default ItemSearch;
