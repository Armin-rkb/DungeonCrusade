using UnityEngine;
using System.Collections;

public class SockHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Sock sock;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;
    [SerializeField] private PlayerMovement _playerMovement;

    public delegate void SockEventHandler();
    public SockEventHandler OnSockThrow;

    private int _playerNum;

    public int GetPlayerNumber
    {
        get { return _playerNum; }
    }

    void Start()
    {
        _playerNum = _playerMovement.PlayerNumber;
    }

    public void Shoot()
    {

        if (OnSockThrow != null)
            OnSockThrow();

        if (flip.facingRight)
        {
            

            Sock currSock = Instantiate(sock, new Vector2(transform.position.x + .5f, transform.position.y), sock.transform.rotation) as Sock;

            currSock.gameObject.GetComponent<Sock>().playernum = _playerNum;

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currSock.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currSock.GetComponent<Sock>().ShootRight();
        }
        else
        {
            Sock currSock = Instantiate(sock, new Vector2(transform.position.x - .5f, transform.position.y), Quaternion.Inverse(sock.transform.rotation)) as Sock;

            currSock.gameObject.GetComponent<Sock>().playernum = _playerNum;

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currSock.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currSock.GetComponent<Sock>().ShootLeft();
        }
    }
}
