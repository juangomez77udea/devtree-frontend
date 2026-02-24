import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { social } from '../data/social';
import DevTreeInput from '../components/DevTreeInput';
import { isValidUrl } from '../utils';
import { toast } from 'sonner';
import { updateProfile } from '../api/DevTreeAPI';
import type { User, DevtreeLink } from '../types';


export default function LinkTreeView() {
  const queryClient = useQueryClient();
  const user: User | undefined = queryClient.getQueryData(['user']);
  
  const [devtreeLinks, setDevTreeLinks] = useState<DevtreeLink[]>(() => {
    if (user?.links) {
      try {
        const savedLinks: DevtreeLink[] = JSON.parse(user.links);
        if (savedLinks.length > 0) {
          return social.map(item => {
            const userlink = savedLinks.find(link => link.name === item.name);
            return userlink ? { ...item, url: userlink.url, enabled: userlink.enabled } : item;
          });
        }
      } catch (e) { console.error(e); }
    }
    return social;
  });

  // Sincronizar cuando los datos de la caché cambien (ej. al cargar la página)
  useEffect(() => {
    if (user?.links) {
      const savedLinks: DevtreeLink[] = JSON.parse(user.links);
      const updatedData = social.map(item => {
        const userlink = savedLinks.find(link => link.name === item.name);
        return userlink ? { ...item, url: userlink.url, enabled: userlink.enabled } : item;
      });
      setDevTreeLinks(updatedData);
    }
  }, [user?.links]); 

  const { mutate } = useMutation({
    mutationFn: updateProfile,
    onError: (error) => toast.error(error.message),
    onSuccess: () => toast.success('Actualizado correctamente')
  });

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedLinks = devtreeLinks.map(link =>
      link.name === e.target.name ? { ...link, url: e.target.value } : link
    );
    setDevTreeLinks(updatedLinks);

    // Actualizamos caché para vista previa en tiempo real
    queryClient.setQueryData(['user'], (prevData: User) => ({
        ...prevData,
        links: JSON.stringify(updatedLinks)
    }));
  };

  const handleEnableLink = (socialNetwork: string) => {
    const updatedLinks = devtreeLinks.map(link => {
      if (link.name === socialNetwork) {
        if (isValidUrl(link.url)) {
          return { ...link, enabled: !link.enabled };
        } else {
          toast.error('URL no válida');
        }
      }
      return link;
    });

    setDevTreeLinks(updatedLinks);

    // Actualizamos la caché para que el componente Devtree.tsx se entere del cambio
    queryClient.setQueryData(['user'], (prevData: User) => ({
      ...prevData,
      links: JSON.stringify(updatedLinks)
    }));
  };

  const updatedUser = { ...user!, links: JSON.stringify(devtreeLinks) };

  return (
    <div className='space-y-5'>
      {devtreeLinks.map(item => (
        <DevTreeInput
          key={item.name}
          item={item}
          handleUrlChange={handleUrlChange}
          handleEnableLink={handleEnableLink}
        />
      ))}
      <button
        className='bg-cyan-400 p-2 text-lg w-full uppercase text-slate-600 rounded font-bold'
        onClick={() => mutate(updatedUser)}
      >
        Guardar cambios
      </button>
    </div>
  );
}