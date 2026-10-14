import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import { findCollection } from '../utils/collections';
import Chip from '../components/ui/Chip';
import TitleGrid from '../components/TitleGrid';
import NotFound from './NotFound';

// Regional and anime collections (spec 0002): header, media type chips, paged grid.
const CollectionPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const collection = findCollection(slug);
  const type = collection?.types.includes(params.get('type')) ? params.get('type') : collection?.types[0];

  const loadKey = `${slug}|${type}`;
  const [rawItems, setItems] = useState([]);
  const [loadedKey, setLoadedKey] = useState(null);
  const items = loadedKey === loadKey ? rawItems : []; // hide stale titles while a new type loads
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [busy, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);
  const loading = busy || loadedKey !== loadKey; // first page of a new type counts as loading

  const [retry, setRetry] = useState(0);

  const fetchPage = useCallback(async (pageNum) => {
    try {
      return await collection.fetch(type, pageNum);
    } catch {
      return { results: [], error: true };
    }
  }, [collection, type]);

  const apply = useCallback((data, pageNum) => {
    setError(!!data?.error);
    const results = data?.results || [];
    setItems((prev) => (pageNum === 1 ? results : [...prev, ...results]));
    setLoadedKey(`${collection.slug}|${type}`);
    setTotalPages(Math.min(data?.totalPages || data?.total_pages || 0, 500));
    setPage(pageNum);
    setLoading(false);
  }, [collection, type]);

  // First page: state is only set after the request resolves.
  useEffect(() => {
    if (!collection) return undefined;
    const id = ++requestId.current;
    fetchPage(1).then((data) => {
      if (id === requestId.current) apply(data, 1);
    });
    window.scrollTo(0, 0);
    return undefined;
  }, [collection, fetchPage, apply, retry]);

  const loadMore = async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    const data = await fetchPage(page + 1);
    if (id === requestId.current) apply(data, page + 1);
  };

  if (!collection) return <NotFound />;

  const setType = (t) => setParams(t === collection.types[0] ? {} : { type: t }, { replace: true });

  return (
    <div className="font-body text-white">
      <section
        className="pt-28 md:pt-32 pb-8 px-4 md:px-8 lg:px-16"
        style={{ backgroundImage: `radial-gradient(ellipse at top left, ${collection.colors[0]}77, transparent 60%), radial-gradient(ellipse at top right, ${collection.colors[1]}55, transparent 55%)` }}
      >
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-muted">
            <li><Link to="/categories" className="hover:text-white">Categories</Link></li>
            <li className="flex items-center gap-1.5"><ChevronRight size={14} aria-hidden="true" /><span aria-current="page" className="text-white">{collection.title}</span></li>
          </ol>
        </nav>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] font-medium text-rating">
          <Sparkles size={13} aria-hidden="true" /> Collection
        </p>
        <h1 className="mt-2 font-display text-display-lg uppercase">{collection.title}</h1>
        <p className="mt-3 text-base text-muted max-w-2xl">{collection.blurb}</p>

        {collection.types.length > 1 && (
          <div role="group" aria-label="Media type" className="mt-6 flex gap-2">
            {collection.types.map((t) => (
              <Chip key={t} selected={type === t} onClick={() => setType(t)}>{t === 'tv' ? 'TV Shows' : 'Movies'}</Chip>
            ))}
          </div>
        )}
      </section>

      <section aria-label={`${collection.title} titles`} className="px-4 md:px-8 lg:px-16">
        <TitleGrid
          items={items}
          loading={loading}
          error={error}
          hasMore={page < totalPages}
          onLoadMore={loadMore}
          onRetry={() => { setLoading(true); setError(false); setRetry((n) => n + 1); }}
          onOpen={(m) => navigate(`/${m.type || type}/${m.id}`)}
        />
      </section>
    </div>
  );
};

export default CollectionPage;
