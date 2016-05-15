using UnityEngine;
using System.Collections;

public class SockHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Sock sock;
    private PlayerFlip flip;


    void Awake()
    {
        flip = GetComponent<PlayerFlip>();
    }

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Sock currSock = Instantiate(sock, new Vector2(transform.position.x + 1, transform.position.y), sock.transform.rotation) as Sock;
            currSock.GetComponent<Sock>().ShootRight();
        }
        else
        {
            Sock currSock = Instantiate(sock, new Vector2(transform.position.x - 1, transform.position.y), Quaternion.Inverse(sock.transform.rotation)) as Sock;
            currSock.GetComponent<Sock>().ShootLeft();
        }
    }
}
