import React, { useState, useRef } from 'react';
import axios from 'axios';
import { BiLoaderAlt } from 'react-icons/bi';
import { IoRefreshCircleOutline } from 'react-icons/io5';

function LinkPreview({ url }) {
  const [linkPreview, setLinkPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const cancelToken = useRef(null);

  const fetchLinkPreview = async () => {
    try {
      setLoading(true);
      console.log('Fetching link preview for URL:', url); // Add console log here
      const source = axios.CancelToken.source();
      cancelToken.current = source;
      const response = await axios.get(
        `/url-preview?url=${encodeURIComponent(url)}`,
        { cancelToken: source.token }
      );
      console.log('Received data from backend:', response.data);
      setLinkPreview(response.data);
      setShowPreview(true);
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Request canceled:', error.message);
      } else {
        console.error('Failed to fetch link preview:', error);
        setError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = () => {
    if (cancelToken.current) {
      cancelToken.current.cancel('Request canceled by the user');
    }
  };

  const handleClose = () => {
    setLinkPreview(null);
    setShowPreview(false);
    setError(null);
  };

  const handleShowPreview = () => {
    if (!linkPreview && !error) {
      fetchLinkPreview();
    } else {
      setShowPreview(true);
    }
  };

  const handleRetry = () => {
    setLinkPreview(null);
    setError(null);
    fetchLinkPreview();
  };

  const handleRedirect = () => {
    let processedUrl = url;
    if (!/^https?:\/\//i.test(processedUrl)) {
      processedUrl = 'http://' + processedUrl;
    }
    window.open(processedUrl, '_blank'); // Programmatically open URL in new tab
  };

  const extractDomainName = (url) => {
    // Regular expression to extract the domain name
    const domainRegex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im;
    const matches = url.match(domainRegex);
    return matches && matches.length >= 2 ? matches[1] : null;
  };

  return (
    <div className="my-1">
      {showPreview ? (
        <div className="main-preview relative p-2 rounded-xl flex flex-col overflow-hidden bg-black/5 dark:bg-black/20 active:bg-black/15 dark:active:bg-black/50">
          <div
            className="relative p-2 rounded-xl overflow-hidden bg-black/15 dark:bg-black hover:bg-black/30 dark:hover:bg-black/75 mb-2 text-center"
            onClick={handleClose}
            role="button"
          >
            <p>Close Preview</p>
          </div>
          <div>
            <div onClick={handleRedirect} className="no-underline text-inherit">
              <div>
                {!linkPreview?.video && linkPreview?.image && (
                  <img
                    className="rounded-lg w-[100%] h-auto"
                    src={linkPreview.image}
                    alt="Link Preview"
                  />
                )}
                {linkPreview?.video && (
                  <iframe
                    className="rounded-lg"
                    src={linkPreview.video}
                    width="100%"
                    height="315"
                    frameBorder="0"
                    allowFullScreen={true}
                    title="Embedded Video"
                  />
                )}
                <div className="p-2 mt-2 rounded-xl flex flex-col overflow-hidden bg-black/5 dark:bg-black/20 active:bg-black/15 dark:active:bg-black/50">
                  <div className="flex items-center leading-4 mt-1">
                    {linkPreview?.titleLogo && (
                      <img
                        src={linkPreview.titleLogo}
                        alt="Title Logo"
                        className="mr-2 w-6 h-6"
                      />
                    )}
                    <div className="font-extrabold">{linkPreview?.title}</div>
                  </div>
                  <p className="text-sm leading-4 mt-1">
                    {linkPreview?.description}
                  </p>
                  {linkPreview?.domain && (
                    <div className="text-xs mt-1">{linkPreview.domain}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="main-loading relative p-2 rounded-xl grid grid-cols-[auto_1fr] overflow-hidden bg-black/5 dark:bg-black/20 active:bg-black/15 dark:active:bg-black/50">
          <span className="flex gap-2 items-center">
            <i className="animate-spin">
              <BiLoaderAlt size={18} />
            </i>
            <p>Loading</p>
            <button onClick={cancelRequest} className='text-red-600 dark:text-red-500'>Cancel</button>
          </span>
        </div>
      ) : error ? (
        <div className="main-error relative p-2 rounded-xl flex flex-col overflow-hidden bg-black/5 dark:bg-black/20 active:bg-black/15 dark:active:bg-black/50">
          <div
            className="relative p-2 rounded-xl overflow-hidden bg-black/15 dark:bg-black hover:bg-black/30 dark:hover:bg-black/75 mb-2 text-center"
            onClick={handleClose}
            role="button"
          >
            <p>Close</p>
          </div>
          <div className="p-2 mt-2 rounded-xl flex flex-col items-center overflow-hidden bg-black/5 dark:bg-black/20 active:bg-black/15 dark:active:bg-black/50">
            <p className="">Error loading preview. Please try again.</p>
            <div
              className="relative p-2 rounded-xl overflow-hidden bg-black/15 dark:bg-black hover:bg-black/30 dark:hover:bg-black/75 mt-2 text-center"
              onClick={handleRetry}
              role="button"
            >
              <span className="flex gap-2 items-center">
                <i className="hover:animate-spin">
                  <IoRefreshCircleOutline />
                </i>
                <p>Retry</p>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="main-show-preview relative p-2 rounded-xl grid grid-cols-[auto_1fr] overflow-hidden bg-black/5 dark:bg-black/20 hover:bg-black/15 dark:hover:bg-black/50 text-center"
          onClick={handleShowPreview}
          role="button"
        >
          <p>
            Show Preview for{' '}
            <linka className="font-bold no-underline">
              {extractDomainName(url)}
            </linka>
          </p>
        </div>
      )}
    </div>
  );
}

export default LinkPreview;
