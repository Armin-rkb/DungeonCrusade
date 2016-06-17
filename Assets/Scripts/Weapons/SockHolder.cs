using UnityEngine;
using System.Collections;

public class SockHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Sock sock;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;
    [SerializeField] private PlayerMovement playernumber;

    public delegate void SockEventHandler();
    public SockEventHandler OnSockThrow;


    public void Shoot()
    {

        if (OnSockThrow != null)
            OnSockThrow();

        if (flip.facingRight)
        {
            

            Sock currSock = Instantiate(sock, new Vector2(transform.position.x + .5f, transform.position.y), sock.transform.rotation) as Sock;

            currSock.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currSock.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currSock.GetComponent<Sock>().ShootRight();
        }
        else
        {
            Sock currSock = Instantiate(sock, new Vector2(transform.position.x - .5f, transform.position.y), Quaternion.Inverse(sock.transform.rotation)) as Sock;

            currSock.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currSock.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currSock.GetComponent<Sock>().ShootLeft();
        }
    }
}
