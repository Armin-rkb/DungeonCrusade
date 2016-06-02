using UnityEngine;
using System.Collections;

public class PillHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Pill pill;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;
    [SerializeField] private PlayerMovement playernumber;


    void Awake()
    {
        flip = GetComponent<PlayerFlip>();
    }

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Pill currPill = Instantiate(pill, new Vector2(transform.position.x + .5f, transform.position.y), pill.transform.rotation) as Pill;

            currPill.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;


            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currPill.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currPill.GetComponent<Pill>().ShootRight();
        }
        else
        {
            Pill currPill = Instantiate(pill, new Vector2(transform.position.x - .5f, transform.position.y), Quaternion.Inverse(pill.transform.rotation)) as Pill;

            currPill.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;
            
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currPill.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currPill.GetComponent<Pill>().ShootLeft();
        }
    }
}
