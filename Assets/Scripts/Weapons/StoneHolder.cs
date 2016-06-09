using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class StoneHolder : MonoBehaviour, IWeapon
{
    public delegate void StoneEventHandler();
    public StoneEventHandler OnStoneThrow;

    [SerializeField] private Stone stone;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;
    [SerializeField] private PlayerMovement playernumber;



    public void Shoot()
    {
        if (flip.facingRight)
        {
            if (OnStoneThrow != null)
                OnStoneThrow();

            Stone currStone = Instantiate(stone, new Vector2(transform.position.x + .1f, transform.position.y), stone.transform.rotation) as Stone;

            currStone.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currStone.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currStone.GetComponent<Stone>().ShootRight();
        }
        else
        {

            if (OnStoneThrow != null)
                OnStoneThrow();

            Stone currStone = Instantiate(stone, new Vector2(transform.position.x - .1f, transform.position.y), Quaternion.Inverse(stone.transform.rotation)) as Stone;

            currStone.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;
            
            
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currStone.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currStone.GetComponent<Stone>().ShootLeft();
        }
    }
}
